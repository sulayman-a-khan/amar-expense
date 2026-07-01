import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db'; // তোমার db.js ফাইলের পাথ অনুযায়ী
import { Wallet, Bike, DailyCollection, Expense, IncomeSource, Loan, DailyClosing, DriverDue, RentWithdrawal } from '@/models/models';
import { startOfTodayDhaka, toNoonUTC } from '@/lib/dateUtils';

const WALLET_NAMES = ['Pocket', 'Drawer'];

async function ensureWallets() {
  // One-time migration: an older version of this app had a 'Business'
  // wallet. If that document still exists in the database, fold its
  // balance into Pocket (rather than just deleting it, which would
  // silently erase real money) and remove the stale wallet so it can
  // never come back via the new Mongoose enum (which no longer allows it).
  // findOneAndDelete is atomic, so even if two requests race here, only
  // one of them can ever actually find+remove the document — preventing
  // a double-credit into Pocket.
  const staleBusiness = await Wallet.findOneAndDelete({ name: 'Business' });
  if (staleBusiness && staleBusiness.balance !== 0) {
    await Wallet.findOneAndUpdate(
      { name: 'Pocket' },
      { $inc: { balance: staleBusiness.balance } },
      { upsert: true }
    );
  }

  // Single query to see which wallets already exist, then create only
  // the missing ones in parallel — avoids 3 sequential round-trips.
  const existing = await Wallet.find({ name: { $in: WALLET_NAMES } });
  const existingNames = new Set(existing.map((w) => w.name));
  const missing = WALLET_NAMES.filter((n) => !existingNames.has(n));

  if (missing.length > 0) {
    await Wallet.insertMany(missing.map((name) => ({ name, balance: 0 })));
    return Wallet.find({ name: { $in: WALLET_NAMES } });
  }
  return existing;
}

async function ensureBikes() {
  let bikes = await Bike.find({});
  if (bikes.length === 0) {
    bikes = await Bike.create([
      { name: '01', driverName: 'রহিম মিয়া', dailyRent: 500 },
      { name: '02', driverName: 'করিম আলী', dailyRent: 500 },
      { name: '03', driverName: 'সফিজ উদ্দিন', dailyRent: 500 },
      { name: 'Shajahan Kaka', driverName: 'Shajahan Kaka', dailyRent: 100, isShajahanKaka: true }
    ]);
  } else {
    const shajahan = await Bike.findOne({ isShajahanKaka: true });
    if (!shajahan) {
      const newShajahan = await Bike.create({
        name: 'Shajahan Kaka',
        driverName: 'Shajahan Kaka',
        dailyRent: 100,
        isShajahanKaka: true
      });
      bikes.push(newShajahan);
    }
  }
  return bikes;
}

// One-time cleanup: an older version of this app logged rent shortfalls as
// generic Loan documents, which showed up mixed in on the Loans page. Those
// are now tracked separately via DriverDue/DriverDueEntry instead, so any
// leftover old-style entries (recognizable by their note prefix) are removed.
// This never touches genuine loans given to/taken from someone.
async function cleanupOldShortfallLoans() {
  await Loan.deleteMany({ note: { $regex: '^Rent shortfall' } });
}

export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // When a specific date is requested (e.g. backdated view), anchor it to
    // that calendar day's midnight in Dhaka time. Otherwise use today in
    // Dhaka time — never the server's own local timezone (Vercel runs UTC).
    const startOfDay = dateParam
      ? new Date(Date.UTC(
          Number(dateParam.split('-')[0]),
          Number(dateParam.split('-')[1]) - 1,
          Number(dateParam.split('-')[2]),
          0, 0, 0
        ))
      : startOfTodayDhaka();
    const yesterdayStart = new Date(startOfDay);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
    const yesterdayEnd = new Date(startOfDay);

    // One-time cleanup (safe to run on every request — becomes a no-op
    // once the old records are gone): remove legacy rent-shortfall Loan
    // documents before querying unresolvedLoans below, so they can never
    // appear on the Loans page or inflate its totals.
    await cleanupOldShortfallLoans();

    // Run every independent query concurrently instead of one-by-one —
    // this is what was making the dashboard slow to load, especially
    // over a higher-latency connection to Atlas.
    const [
      bikes,
      allWallets,
      todayCollections,
      todayExpenses,
      todayIncomes,
      unresolvedLoans,
      yesterdayClosing,
      yesterdayCollections,
      latestClosing,
      driverDues,
      todayRentWithdrawals,
    ] = await Promise.all([
      ensureBikes(),
      ensureWallets(),
      DailyCollection.find({ createdAt: { $gte: startOfDay } }).populate('bikeId'),
      Expense.find({ createdAt: { $gte: startOfDay } }),
      IncomeSource.find({ createdAt: { $gte: startOfDay } }),
      Loan.find({ resolved: false }),
      DailyClosing.findOne({ date: { $gte: yesterdayStart, $lt: yesterdayEnd } }),
      DailyCollection.find({ date: { $gte: yesterdayStart, $lt: yesterdayEnd } }),
      DailyClosing.findOne().sort({ date: -1 }), // Get the latest closing cash
      DriverDue.find({ balance: { $gt: 0 } }).populate('bikeId'),
      RentWithdrawal.find({ createdAt: { $gte: startOfDay } }),
    ]);

    const walletsObj = {};
    allWallets.forEach((w) => { walletsObj[w.name] = w.balance; });

    let totalIncome = 0;
    todayCollections.forEach((c) => { totalIncome += c.paidRent; });
    todayIncomes.forEach((i) => { totalIncome += i.amount; });
    todayRentWithdrawals.forEach((w) => { totalIncome += w.amount; });

    let totalExpense = 0;
    todayExpenses.forEach((e) => { if (!e.isCredit) totalExpense += e.amount; });

    const netProfit = totalIncome - totalExpense;

    // Module 4: Liability snapshot. "Owed to Me" combines two distinct
    // sources — bike rent shortfalls (DriverDue) and cash given as loans
    // (Loan, type Receivable) — shown together as one total but broken
    // out separately so the dashboard can offer a tab for each.
    let cashLoanReceivable = 0;
    let totalPayable = 0;
    const cashLoans = [];
    unresolvedLoans.forEach((l) => {
      if (l.type === 'Receivable') {
        cashLoanReceivable += l.amount;
        cashLoans.push({ _id: l._id, person: l.person, amount: l.amount, date: l.date, note: l.note });
      } else {
        totalPayable += l.amount;
      }
    });

    let bikeDueTotal = 0;
    const bikeDues = driverDues.map((d) => {
      bikeDueTotal += d.balance;
      return {
        bikeId: d.bikeId?._id,
        bikeName: d.bikeId?.name || '?',
        driverName: d.bikeId?.driverName || 'Unknown',
        amount: d.balance,
      };
    });

    const totalReceivable = bikeDueTotal + cashLoanReceivable;

    // Activity timeline
    const activities = [];
    todayCollections.forEach((c) => {
      activities.push({
        id: c._id,
        createdAt: c.createdAt,
        time: new Date(c.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        type: 'rent',
        sourceType: 'DailyCollection',
        text: c.bikeId?.isShajahanKaka 
          ? `Shajahan Kaka Rent In: ৳${c.paidRent} জমা হয়েছে।`
          : `Bike ${c.bikeId?.name || ''} Rent In: ৳${c.paidRent} জমা হয়েছে।`
      });
    });
    todayIncomes.forEach((i) => {
      activities.push({
        id: i._id,
        createdAt: i.createdAt,
        time: new Date(i.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        type: 'income',
        sourceType: 'IncomeSource',
        text: `${i.name} [${i.type}]: ৳${i.amount} → ${i.wallet}`
      });
    });
    todayRentWithdrawals.forEach((w) => {
      activities.push({
        id: w._id,
        createdAt: w.createdAt,
        time: new Date(w.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        type: 'income',
        sourceType: null, // not deletable via the generic mechanism — see /shop-rent for management
        text: `Shop Rent collected: ৳${w.amount}${w.note ? ` (${w.note})` : ''}`
      });
    });
    todayExpenses.forEach((e) => {
      activities.push({
        id: e._id,
        createdAt: e.createdAt,
        time: new Date(e.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        type: 'expense',
        sourceType: 'Expense',
        text: `Expense [${e.category}]: ৳${e.amount} ${e.isCredit ? `(Credit → ${e.payableToShop})` : `(${e.wallet})`}. ${e.note ? `[${e.note}]` : ''}`
      });
    });
    activities.sort((a, b) => b.time.localeCompare(a.time));

    // Missing-entry check (Module 9)
    // Check both closing AND bike collections independently so the user
    // sees everything that still needs to be done in a single view.
    let missingYesterday = false;
    const missingParts = [];

    const collectedBikeIds = yesterdayCollections.map((c) => c.bikeId.toString());
    const missingBikes = bikes.filter((b) => !collectedBikeIds.includes(b._id.toString()));
    if (missingBikes.length > 0) {
      missingYesterday = true;
      const regularMissing = missingBikes.filter((b) => !b.isShajahanKaka).map((b) => b.name);
      const shajahanMissing = missingBikes.some((b) => b.isShajahanKaka);
      const parts = [];
      if (regularMissing.length > 0) {
        parts.push(`Bike ${regularMissing.join(', ')}`);
      }
      if (shajahanMissing) {
        parts.push('Shajahan Kaka');
      }
      missingParts.push(`Rent missing for: ${parts.join(' & ')}`);
    }

    if (!yesterdayClosing) {
      missingYesterday = true;
      missingParts.push('Daily closing cash not yet locked');
    }

    const missingReason = missingParts.join(' | ');

    return NextResponse.json({
      wallets: walletsObj,
      summary: { netProfit, totalIncome, totalExpense, totalReceivable, totalPayable, bikeDueTotal, cashLoanReceivable },
      receivableBreakdown: { bikeDues, cashLoans },
      bikes: bikes.map((b) => ({ _id: b._id, name: b.name, driver: b.driverName, dailyRent: b.dailyRent, isShajahanKaka: b.isShajahanKaka })),
      activities: activities.slice(0, 12),
      missingYesterday,
      missingReason,
      latestClosingCash: latestClosing ? latestClosing.closingCash : 0
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { action, date, closingCash, note } = body;

    if (action === 'dailyClosing') {
      const closingDate = toNoonUTC(date);

      const existingClosing = await DailyClosing.findOne({ date: closingDate });
      if (existingClosing) {
        return NextResponse.json({ error: 'Daily closing already locked for this date' }, { status: 400 });
      }

      const closing = await DailyClosing.create({
        date: closingDate,
        closingCash: Number(closingCash),
        note: note || ''
      });

      return NextResponse.json({ success: true, closing });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
