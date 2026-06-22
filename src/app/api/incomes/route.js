import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Wallet, DailyCollection, Expense, WalletTransfer, Bike } from '@/models/model';

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { amount, type, wallet, toWallet, bikeId, note } = body;
    const today = new Date();

    // ১. RENT IN FUNCTIONALITY
    if (type === 'rent') {
      const bike = await Bike.findById(bikeId);

      // DailyCollection কালেকশনে ডাটা পুশ
      await DailyCollection.create({
        bikeId,
        date: today,
        shift: 'Full Day',
        expectedRent: bike ? bike.dailyRent : 500,
        paidRent: Number(amount),
        offDayReason: 'N/A'
      });

      // Business ওয়ালেটে ব্যালেন্স প্লাস
      await Wallet.findOneAndUpdate({ name: 'Business' }, { $inc: { balance: Number(amount) } });
    }

    // ২. EXPENSE FUNCTIONALITY
    else if (type === 'expense') {
      await Expense.create({
        category: 'General',
        amount: Number(amount),
        note: note || '',
        wallet: wallet,
        date: today
      });

      // নির্দিষ্ট ওয়ালেট থেকে ব্যালেন্স মাইনাস
      await Wallet.findOneAndUpdate({ name: wallet }, { $inc: { balance: -Number(amount) } });
    }

    // ৩. TRANSFER FUNCTIONALITY
    else if (type === 'transfer') {
      await WalletTransfer.create({
        fromWallet: wallet,
        toWallet: toWallet,
        amount: Number(amount),
        date: today
      });

      // এক ওয়ালেট থেকে মাইনাস, অন্য ওয়ালেটে প্লাস
      await Wallet.findOneAndUpdate({ name: wallet }, { $inc: { balance: -Number(amount) } });
      await Wallet.findOneAndUpdate({ name: toWallet }, { $inc: { balance: Number(amount) } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}