import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db'; // তোমার db.js ফাইলের পাথ অনুযায়ী
import { Wallet, Bike, DailyCollection, Expense, IncomeSource, Loan, DailyClosing, DriverDue, RentWithdrawal } from '@/models/models';
import { startOfTodayDhaka, toNoonUTC } from '@/lib/dateUtils';
import { backfillMissedDays } from '@/lib/driverDue';

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
    const yesterdayEnd = startOfTodayDhaka(); // real "today" start, regardless of which date is being viewed
    const yesterdayStart = new Date(yesterdayEnd);
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    // One-time cleanup (safe to run on every request — becomes a no-op
    // once the old records are gone): remove legacy rent-shortfall Loan
    // documents before querying unresolvedLoans below, so they can never
    // appear on the Loans page or inflate its totals.
    await cleanupOldShortfallLoans();

    // Bikes must be ensured first, and Shajahan Kaka's missed days backfilled
    // (auto "Not Given" for any day with no entry) before the due-dependent
    // queries below run, so driverDues/bikeDues reflect the up-to-date balance.
    const bikes = await ensureBikes();
    const shajahanBike = bikes.find((b) => b.isShajahanKaka);
    if (shajahanBike) {
      await backfillMissedDays(shajahanBike);
    }

    // Run every independent query concurrently instead of one-by-one —
    // this is what was making the dashboard slow to load, especially
    // over a higher-latency connection to Atlas.
    const [
      allWallets,
      todayCollections,
      todayExpenses,
      todayIncomes,
      unresolvedLoans,
      yesterdayCollections,
      driverDues,
      todayRentWithdrawals,
    ] = await Promise.all([
      ensureWallets(),
      DailyCollection.find({ date: { $gte: startOfDay, $lt: endOfDay } }).populate('bikeId'),
      Expense.find({ date: { $gte: startOfDay, $lt: endOfDay } }),
      IncomeSource.find({ date: { $gte: startOfDay, $lt: endOfDay } }),
      Loan.find({ resolved: false }),
      DailyCollection.find({ date: { $gte: yesterdayStart, $lt: yesterdayEnd } }),
      DriverDue.find({ balance: { $gt: 0 } }).populate('bikeId'),
      RentWithdrawal.find({ date: { $gte: startOfDay, $lt: endOfDay } }),
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
        isShajahanKaka: d.bikeId?.isShajahanKaka || false,
      };
    });

    const totalReceivable = bikeDueTotal + cashLoanReceivable;

    // Today's ledger cards — same shape of detail as the Full Ledger page
    // (bike/shift/wallet badges etc.), scoped to the selected day, so the
    // dashboard can show real ledger entries in place of the old plain-text
    // activity feed while still supporting tap-and-hold delete.
    const activities = [];
    todayCollections.forEach((c) => {
      activities.push({
        id: c._id,
        createdAt: c.createdAt,
        time: new Date(c.createdAt).toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
        category: 'Income',
        subType: 'Bike Collection',
        sourceType: 'DailyCollection',
        title: c.bikeId?.isShajahanKaka ? 'Shajahan Kaka' : (c.bikeId?.driverName || 'Driver'),
        activityText: c.bikeId?.isShajahanKaka
          ? (c.shift === 'Off Day' ? `Shajahan Kaka এর গাড়ি বন্ধ` : c.paidRent === 0 ? `Shajahan Kaka জমা দেয়নি` : `Shajahan Kaka জমা দিয়েছে`)
          : (() => {
              const who = c.bikeId?.driverName || 'Bike ' + (c.bikeId?.name || '');
              if (c.shift === 'Off Day') return `${who} এর গাড়ি বন্ধ`;
              return c.paidRent === 0 ? `${who} জমা দেয়নি` : `${who} জমা দিয়েছে`;
            })(),
        amount: c.paidRent,
        bikeName: c.bikeId?.isShajahanKaka
          ? 'Bike 4'
          : (c.bikeId?.name ? (/^bike/i.test(c.bikeId.name.trim()) ? c.bikeId.name : `Bike ${c.bikeId.name}`) : 'Bike'),
        shift: c.shift,
        expectedRent: c.expectedRent,
        offDayReason: c.offDayReason,
        isOffDay: c.shift === 'Off Day',
      });
    });
    todayIncomes.forEach((i) => {
      activities.push({
        id: i._id,
        createdAt: i.createdAt,
        time: new Date(i.createdAt).toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
        category: 'Income',
        subType: i.type,
        sourceType: 'IncomeSource',
        title: i.name,
        amount: i.amount,
        wallet: i.wallet,
      });
    });
    todayRentWithdrawals.forEach((w) => {
      activities.push({
        id: w._id,
        createdAt: w.createdAt,
        time: new Date(w.createdAt).toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
        category: 'Income',
        subType: 'Shop Rent',
        sourceType: null, // not deletable via the generic mechanism — see /shop-rent for management
        title: 'Shop Rent',
        activityText: w.note || '',
        amount: w.amount,
      });
    });
    todayExpenses.forEach((e) => {
      activities.push({
        id: e._id,
        createdAt: e.createdAt,
        time: new Date(e.createdAt).toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
        category: 'Expense',
        subType: e.category,
        sourceType: 'Expense',
        title: e.category,
        amount: e.amount,
        wallet: e.wallet,
        isCredit: e.isCredit,
        payableToShop: e.payableToShop,
        noteText: e.note,
      });
    });
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
        parts.push(regularMissing.join(', '));
      }
      if (shajahanMissing) {
        parts.push('Shajahan Kaka');
      }
      missingParts.push(`Rent missing for: ${parts.join(' & ')}`);
    }

    const missingReason = missingParts.join(' | ');

    return NextResponse.json({
      wallets: walletsObj,
      summary: { netProfit, totalIncome, totalExpense, totalReceivable, totalPayable, bikeDueTotal, cashLoanReceivable },
      receivableBreakdown: { bikeDues, cashLoans },
      bikes: bikes.map((b) => {
        const todayColl = todayCollections.find((c) => c.bikeId?._id?.toString() === b._id.toString());
        return {
          _id: b._id,
          name: b.name,
          driver: b.driverName,
          dailyRent: b.dailyRent,
          isShajahanKaka: b.isShajahanKaka,
          collectedToday: todayColl ? todayColl.shift : null,
          paidToday: todayColl ? todayColl.paidRent : null,
          expectedToday: todayColl ? todayColl.expectedRent : null,
        };
      }),
      activities: activities.slice(0, 12),
      missingYesterday,
      missingReason,
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
