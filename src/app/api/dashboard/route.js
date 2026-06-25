import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db'; // তোমার db.js ফাইলের পাথ অনুযায়ী
import { Wallet, Bike, DailyCollection, Expense, IncomeSource, Loan, DailyClosing } from '@/models/models';

const WALLET_NAMES = ['Business', 'Pocket', 'Drawer'];

async function ensureWallets() {
  // Single query to see which wallets already exist, then create only
  // the missing ones in parallel — avoids 3 sequential round-trips.
  const existing = await Wallet.find({ name: { $in: WALLET_NAMES } });
  const existingNames = new Set(existing.map((w) => w.name));
  const missing = WALLET_NAMES.filter((n) => !existingNames.has(n));

  if (missing.length > 0) {
    await Wallet.insertMany(missing.map((name) => ({ name, balance: 0 })));
    return Wallet.find({});
  }
  return existing;
}

async function ensureBikes() {
  const bikes = await Bike.find({});
  if (bikes.length === 0) {
    return Bike.create([
      { name: '01', driverName: 'রহিম মিয়া', dailyRent: 500 },
      { name: '02', driverName: 'করিম আলী', dailyRent: 500 },
      { name: '03', driverName: 'সফিজ উদ্দিন', dailyRent: 500 },
    ]);
  }
  return bikes;
}

export async function GET() {
  try {
    await connectToDatabase();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(startOfDay);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(startOfDay);

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
    ] = await Promise.all([
      ensureBikes(),
      ensureWallets(),
      DailyCollection.find({ createdAt: { $gte: startOfDay } }).populate('bikeId'),
      Expense.find({ createdAt: { $gte: startOfDay } }),
      IncomeSource.find({ createdAt: { $gte: startOfDay } }),
      Loan.find({ resolved: false }),
      DailyClosing.findOne({ date: { $gte: yesterdayStart, $lt: yesterdayEnd } }),
      DailyCollection.find({ date: { $gte: yesterdayStart, $lt: yesterdayEnd } }),
    ]);

    const walletsObj = {};
    allWallets.forEach((w) => { walletsObj[w.name] = w.balance; });

    let totalIncome = 0;
    todayCollections.forEach((c) => { totalIncome += c.paidRent; });
    todayIncomes.forEach((i) => { totalIncome += i.amount; });

    let totalExpense = 0;
    todayExpenses.forEach((e) => { if (!e.isCredit) totalExpense += e.amount; });

    const netProfit = totalIncome - totalExpense;

    // Module 4: Liability snapshot
    let totalReceivable = 0;
    let totalPayable = 0;
    unresolvedLoans.forEach((l) => {
      if (l.type === 'Receivable') totalReceivable += l.amount;
      else totalPayable += l.amount;
    });

    // Activity timeline
    const activities = [];
    todayCollections.forEach((c) => {
      activities.push({
        id: c._id,
        time: new Date(c.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        type: 'income',
        text: `Bike ${c.bikeId?.name || ''} Rent In: ৳${c.paidRent} জমা হয়েছে।`
      });
    });
    todayIncomes.forEach((i) => {
      activities.push({
        id: i._id,
        time: new Date(i.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        type: 'income',
        text: `${i.name} [${i.type}]: ৳${i.amount} → ${i.wallet}`
      });
    });
    todayExpenses.forEach((e) => {
      activities.push({
        id: e._id,
        time: new Date(e.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        type: 'expense',
        text: `Expense [${e.category}]: ৳${e.amount} ${e.isCredit ? `(Credit → ${e.payableToShop})` : `(${e.wallet})`}. ${e.note ? `[${e.note}]` : ''}`
      });
    });
    activities.sort((a, b) => b.time.localeCompare(a.time));

    // Missing-entry check (Module 9)
    // Check both closing AND bike collections independently so the user
    // sees everything that still needs to be done in a single view.
    let missingYesterday = false;
    const missingParts = [];
    let missingBikeNames = [];

    const collectedBikeIds = yesterdayCollections.map((c) => c.bikeId.toString());
    const missingBikes = bikes.filter((b) => !collectedBikeIds.includes(b._id.toString()));
    if (missingBikes.length > 0) {
      missingYesterday = true;
      missingBikeNames = missingBikes.map((b) => b.name);
      missingParts.push(`Bike rent missing for: ${missingBikeNames.join(', ')}`);
    }

    if (!yesterdayClosing) {
      missingYesterday = true;
      missingParts.push('Daily closing cash not yet locked');
    }

    const missingReason = missingParts.join(' | ');

    return NextResponse.json({
      wallets: walletsObj,
      summary: { netProfit, totalIncome, totalExpense, totalReceivable, totalPayable },
      bikes: bikes.map((b) => ({ _id: b._id, name: b.name, driver: b.driverName, dailyRent: b.dailyRent })),
      activities: activities.slice(0, 12),
      missingYesterday,
      missingReason
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
      const closingDate = new Date(date || new Date());
      closingDate.setHours(12, 0, 0, 0);

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
