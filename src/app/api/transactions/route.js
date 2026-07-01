import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { DailyCollection, Expense, IncomeSource, Loan, WalletTransfer, DailyClosing, RentWithdrawal } from '@/models/models';

export async function GET() {
  try {
    await dbConnect();

    // Fetch all logs
    const collections = await DailyCollection.find({}).populate('bikeId').sort({ date: -1 });
    const expenses = await Expense.find({}).sort({ date: -1 });
    const incomes = await IncomeSource.find({}).sort({ date: -1 });
    const loans = await Loan.find({}).sort({ date: -1 });
    const transfers = await WalletTransfer.find({}).sort({ date: -1 });
    const closings = await DailyClosing.find({}).sort({ date: -1 });
    const rentWithdrawals = await RentWithdrawal.find({}).sort({ date: -1 });

    const allTransactions = [];

    collections.forEach(c => {
      allTransactions.push({
        _id: c._id,
        date: c.date,
        type: 'Income', // Color-coded (Green=Income)
        subType: 'Bike Collection',
        amount: c.paidRent,
        note: `Expected: ৳${c.expectedRent} | Shift: ${c.shift} ${c.shift === 'Off Day' ? `| Reason: ${c.offDayReason}` : ''}`,
        title: `${c.bikeId?.name || 'Bike'} Collection`,
        colorCode: 'text-[#1F7A4D] border-[#1F7A4D] bg-[#E6F0E5]/50'
      });
    });

    incomes.forEach(i => {
      allTransactions.push({
        _id: i._id,
        date: i.date,
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
        type: 'Expense', // Color-coded (Red=Expense)
        subType: e.category,
        amount: e.amount,
        note: e.isCredit ? `Payable to: ${e.payableToShop}` : `Paid from: ${e.wallet} | Note: ${e.note}`,
        title: e.category,
        colorCode: 'text-[#B33B2E] border-[#B33B2E] bg-[#F7E9E5]/50'
      });
    });

    loans.forEach(l => {
      allTransactions.push({
        _id: l._id,
        date: l.date,
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
        type: 'Transfer', // Color-coded (Blue=Transfer)
        subType: 'Wallet Transfer',
        amount: t.amount,
        note: `From ${t.fromWallet} to ${t.toWallet}`,
        title: 'Wallet Transfer',
        colorCode: 'text-[#2E5C8A] border-[#2E5C8A] bg-[#E7EEF4]/50'
      });
    });

    closings.forEach(c => {
      allTransactions.push({
        _id: c._id,
        date: c.date,
        type: 'Closing',
        subType: 'Daily closing',
        amount: c.closingCash,
        note: c.note || 'Verified Cash Drawer amount',
        title: 'Daily Closing Cash',
        colorCode: 'text-[#7D7156] border-[#7D7156] bg-[#F7F3EA]/50'
      });
    });

    // Sort by Date Descending
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json({ transactions: allTransactions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
