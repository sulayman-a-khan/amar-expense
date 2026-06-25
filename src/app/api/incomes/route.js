import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Wallet, IncomeSource } from '@/models/models';

export async function GET() {
  try {
    await connectToDatabase();
    const incomes = await IncomeSource.find({}).sort({ date: -1 }).limit(200);
    return NextResponse.json({ incomes });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Module 5: Multiple Incomes — Shop Rent (monthly fixed), Daily, Irregular
export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { type, name, amount, wallet, date, note } = body;

    if (!type || !name || !amount) {
      return NextResponse.json({ error: 'Type, Name, and Amount are required.' }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    const targetWalletName = wallet || 'Business';
    const targetWallet = await Wallet.findOne({ name: targetWalletName });
    if (!targetWallet) {
      return NextResponse.json({ error: `Wallet ${targetWalletName} not found.` }, { status: 400 });
    }

    const parsedDate = new Date(date || new Date());
    parsedDate.setHours(12, 0, 0, 0);

    const income = await IncomeSource.create({
      type, // 'ShopRent' | 'Daily' | 'Irregular'
      name,
      amount: parsedAmount,
      wallet: targetWalletName,
      date: parsedDate,
      note: note || '',
    });

    targetWallet.balance += parsedAmount;
    await targetWallet.save();

    return NextResponse.json({ success: true, income });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
