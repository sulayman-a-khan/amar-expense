import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Expense, Wallet, Loan } from '@/models/models';

export async function GET() {
  try {
    await dbConnect();
    const expenses = await Expense.find({}).sort({ date: -1 }).limit(200);
    return NextResponse.json({ expenses });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { category, amount, note, imageUrl, isCredit, payableToShop, wallet, date } = body;

    // --- Validate everything up front, before writing anything ---
    if (!category || !amount || !date) {
      return NextResponse.json({ error: 'Category, Amount, and Date are required.' }, { status: 400 });
    }
    if (isCredit && !payableToShop) {
      return NextResponse.json({ error: 'Shop/Mechanic name is required for Credit/Due expenses.' }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    const parsedDate = new Date(date);
    parsedDate.setHours(12, 0, 0, 0);

    let targetWallet = null;
    if (!isCredit) {
      targetWallet = await Wallet.findOne({ name: wallet || 'Business' });
      if (!targetWallet) {
        return NextResponse.json({ error: `Wallet ${wallet} not found.` }, { status: 400 });
      }
      if (targetWallet.balance < parsedAmount) {
        return NextResponse.json({ error: `Insufficient funds in ${wallet} wallet. Mark this as Credit/Due instead if you haven't paid cash yet.` }, { status: 400 });
      }
    }

    // --- All checks passed: now perform the writes ---
    const expense = await Expense.create({
      category,
      amount: parsedAmount,
      note: note || '',
      imageUrl: imageUrl || '',
      isCredit: !!isCredit,
      payableToShop: isCredit ? payableToShop : '',
      wallet: isCredit ? 'Business' : (wallet || 'Business'),
      date: parsedDate
    });

    if (isCredit) {
      // Credit expense: don't touch wallets, log as a Payable liability instead.
      await Loan.create({
        type: 'Payable',
        person: payableToShop,
        amount: parsedAmount,
        note: `Credit from Expense: ${category}. Note: ${note || ''}`,
        date: parsedDate,
        resolved: false
      });
    } else {
      targetWallet.balance -= parsedAmount;
      await targetWallet.save();
    }

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
