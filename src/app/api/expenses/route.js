import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Expense, Wallet, Loan } from '@/models/model';

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { category, amount, note, imageUrl, isCredit, payableToShop, wallet, date } = body;

    if (!category || !amount || !date) {
      return NextResponse.json({ error: 'Category, Amount, and Date are required.' }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    const parsedDate = new Date(date);
    parsedDate.setHours(12, 0, 0, 0);

    // Create the Expense
    const expense = await Expense.create({
      category,
      amount: parsedAmount,
      note: note || '',
      imageUrl: imageUrl || '',
      isCredit: !!isCredit,
      payableToShop: isCredit ? payableToShop : '',
      wallet: isCredit ? 'Business' : (wallet || 'Business'), // defaults if credit
      date: parsedDate
    });

    if (isCredit) {
      // 1. If credit, do NOT deduct from wallets.
      // 2. Log as a Payable Liability to that specific mechanic/shop.
      if (!payableToShop) {
        return NextResponse.json({ error: 'Shop/Mechanic name is required for Credit/Due expenses.' }, { status: 400 });
      }

      await Loan.create({
        type: 'Payable',
        person: payableToShop,
        amount: parsedAmount,
        note: `Credit from Expense: ${category}. Note: ${note || ''}`,
        date: parsedDate,
        resolved: false
      });
    } else {
      // Deduct from selected wallet
      const targetWallet = await Wallet.findOne({ name: wallet || 'Business' });
      if (!targetWallet) {
        return NextResponse.json({ error: `Wallet ${wallet} not found.` }, { status: 400 });
      }

      targetWallet.balance -= parsedAmount;
      await targetWallet.save();
    }

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
