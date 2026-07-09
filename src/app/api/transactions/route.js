import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { DailyCollection, Expense, IncomeSource, Loan, WalletTransfer, RentWithdrawal, DriverDueEntry } from '@/models/models';
import { startOfTodayDhaka } from '@/lib/dateUtils';

export async function GET(request) {
  try {
    await dbConnect();

    // Defaults to just today's entries — loading the entire lifetime
    // ledger on every visit gets slower as the data grows. Pass
    // ?range=all to explicitly load everything (e.g. the "All Time"
    // toggle on the Full Ledger page, or when browsing to a past date).
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') === 'all' ? 'all' : 'today';

    let dateFilter = {};
    if (range === 'today') {
      const startOfDay = startOfTodayDhaka();
      const endOfDay = new Date(startOfDay);
      endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
      dateFilter = { date: { $gte: startOfDay, $lt: endOfDay } };
    }

    // These 6 queries are all independent — running them one-by-one (as
    // before) meant the total wait was the SUM of every query's latency.
    // Promise.all runs them concurrently instead, so the wait is only as
    // long as the slowest one. .lean() also skips Mongoose document
    // hydration, which matters here since every document ever created is
    // being fetched (no date filtering) — meaningful CPU savings as the
    // ledger grows over time.
    const [collections, expenses, incomes, loans, transfers, rentWithdrawals] = await Promise.all([
      DailyCollection.find(dateFilter).populate('bikeId').sort({ date: -1 }).lean(),
      Expense.find(dateFilter).populate('bikeId').sort({ date: -1 }).lean(),
      IncomeSource.find(dateFilter).sort({ date: -1 }).lean(),
      Loan.find(dateFilter).sort({ date: -1 }).lean(),
      WalletTransfer.find(dateFilter).sort({ date: -1 }).lean(),
      RentWithdrawal.find(dateFilter).sort({ date: -1 }).lean(),
    ]);

    // Clearance entries record how much of an overpayment cleared existing
    // driver due, and what the due balance was right after — used to tell
    // "partially reduced the due" apart from "fully paid off the due".
    // Scoped to today's collection ids when range === 'today' so this
    // lookup query doesn't itself have to scan the whole entry history.
    const clearanceFilter =
      range === 'today'
        ? { type: 'clearance', dailyCollectionId: { $in: collections.map((c) => c._id) } }
        : { type: 'clearance' };
    const clearanceEntries = await DriverDueEntry.find(clearanceFilter).lean();
    const clearanceByCollectionId = {};
    clearanceEntries.forEach((entry) => {
      if (entry.dailyCollectionId) clearanceByCollectionId[entry.dailyCollectionId.toString()] = entry;
    });

    const allTransactions = [];

    collections.forEach(c => {
      const clearance = clearanceByCollectionId[c._id.toString()];
      const activityText = c.bikeId?.isShajahanKaka
        ? (c.shift === 'Off Day' ? `Shajahan Kaka এর গাড়ি বন্ধ` : c.paidRent === 0 ? `Shajahan Kaka জমা দেয়নি` : `Shajahan Kaka জমা দিয়েছে`)
        : (() => {
            const who = c.bikeId?.driverName || 'Bike ' + (c.bikeId?.name || '');
            if (c.shift === 'Off Day') return `${who} এর গাড়ি বন্ধ`;
            return c.paidRent === 0 ? `${who} জমা দেয়নি` : `${who} জমা দিয়েছে`;
          })();
      allTransactions.push({
        _id: c._id,
        date: c.date,
        createdAt: c.createdAt,
        type: 'Income', // Color-coded (Green=Income)
        subType: 'Bike Collection',
        amount: c.paidRent,
        note: `Expected: ৳${c.expectedRent} | Shift: ${c.shift} ${c.shift === 'Off Day' ? `| Reason: ${c.offDayReason}` : ''}`,
        activityText,
        title: c.bikeId?.isShajahanKaka ? `Shajahan Kaka` : `${c.bikeId?.driverName || 'Driver'}`,
        bikeName: c.bikeId?.isShajahanKaka
          ? 'Bike 4'
          : (c.bikeId?.name ? (/^bike/i.test(c.bikeId.name.trim()) ? c.bikeId.name : `Bike ${c.bikeId.name}`) : 'Bike'),
        shift: c.shift,
        offDayReason: c.offDayReason,
        expectedRent: c.expectedRent,
        dueCleared: clearance ? clearance.amount : 0,
        dueBalanceAfter: clearance ? clearance.balanceAfter : null,
        colorCode: 'text-[#1F7A4D] border-[#1F7A4D] bg-[#E6F0E5]/50'

      });
    });

    incomes.forEach(i => {
      allTransactions.push({
        _id: i._id,
        date: i.date,
        createdAt: i.createdAt,
        type: 'Income', // Color-coded (Green=Income)
        subType: i.type,
        amount: i.amount,
        note: `Received in ${i.wallet}`,
        title: i.name,
        colorCode: 'text-[#1F7A4D] border-[#1F7A4D] bg-[#E6F0E5]/50'
      });
    });

    rentWithdrawals.forEach(w => {
      allTransactions.push({
        _id: w._id,
        date: w.date,
        createdAt: w.createdAt,
        type: 'Income', // Color-coded (Green=Income)
        subType: 'ShopRent',
        amount: w.amount,
        note: w.note || 'Shop rent collection',
        title: 'Shop Rent',
        colorCode: 'text-[#1F7A4D] border-[#1F7A4D] bg-[#E6F0E5]/50'
      });
    });

    expenses.forEach(e => {
      allTransactions.push({
        _id: e._id,
        date: e.date,
        createdAt: e.createdAt,
        type: 'Expense', // Color-coded (Red=Expense)
        subType: e.category,
        amount: e.amount,
        note: e.isCredit ? `Payable to: ${e.payableToShop}` : `Paid from: ${e.wallet} | Note: ${e.note}`,
        wallet: e.wallet,
        isCredit: e.isCredit,
        payableToShop: e.payableToShop,
        noteText: e.note,
        title: e.category,
        bikeName: e.bikeId?.isShajahanKaka
          ? 'Bike 4'
          : (e.bikeId?.name ? (/^bike/i.test(e.bikeId.name.trim()) ? e.bikeId.name : `Bike ${e.bikeId.name}`) : null),
        colorCode: 'text-[#B33B2E] border-[#B33B2E] bg-[#F7E9E5]/50'
      });
    });

    loans.forEach(l => {
      allTransactions.push({
        _id: l._id,
        date: l.date,
        createdAt: l.createdAt,
        type: 'Loan', // Color-coded (Blue=Loan)
        subType: l.type,
        amount: l.amount,
        note: `Person: ${l.person} | Status: ${l.resolved ? 'Resolved' : 'Due'} | ${l.note}`,
        title: `${l.type} Loan`,
        colorCode: 'text-[#2E5C8A] border-[#2E5C8A] bg-[#E7EEF4]/50'
      });
    });

    transfers.forEach(t => {
      allTransactions.push({
        _id: t._id,
        date: t.date,
        createdAt: t.createdAt,
        type: 'Transfer', // Color-coded (Blue=Transfer)
        subType: 'Wallet Transfer',
        amount: t.amount,
        note: `From ${t.fromWallet} to ${t.toWallet}`,
        title: 'Wallet Transfer',
        colorCode: 'text-[#2E5C8A] border-[#2E5C8A] bg-[#E7EEF4]/50'
      });
    });

    // Sort by Date Descending
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json({ transactions: allTransactions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
