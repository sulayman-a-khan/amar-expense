import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Loan, Wallet, WalletTransfer } from '@/models/models';
import { toNoonUTC } from '@/lib/dateUtils';

export async function GET() {
  try {
    await dbConnect();
    const loans = await Loan.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ loans });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { action, type, person, amount, note, wallet, fromWallet, toWallet, date, loanId } = body;

    const parsedDate = toNoonUTC(date);

    // 1. Log a new Loan
    if (action === 'loan') {
      if (!type || !person || !amount || !wallet) {
        return NextResponse.json({ error: 'Type, Person, Amount, and Wallet are required.' }, { status: 400 });
      }

      const parsedAmount = Number(amount);
      const targetWallet = await Wallet.findOne({ name: wallet });
      if (!targetWallet) {
        return NextResponse.json({ error: `Wallet ${wallet} not found.` }, { status: 400 });
      }

      // Check balance if giving a receivable loan (we pay out cash)
      if (type === 'Receivable' && targetWallet.balance < parsedAmount) {
        return NextResponse.json({ error: `Insufficient funds in ${wallet} wallet.` }, { status: 400 });
      }

      const loan = await Loan.create({
        type,
        person,
        amount: parsedAmount,
        note: note || '',
        date: parsedDate
      });

      // Update wallets:
      // Receivable (money given out) => deducts from wallet.
      // Payable (money received/owed) => adds to wallet (e.g. cash advance / borrowed).
      if (type === 'Receivable') {
        targetWallet.balance -= parsedAmount;
      } else {
        targetWallet.balance += parsedAmount;
      }
      await targetWallet.save();

      return NextResponse.json({ success: true, loan });
    }

    // 2. Resolve/Pay back a Loan
    if (action === 'resolveLoan') {
      if (!loanId || !wallet) {
        return NextResponse.json({ error: 'Loan ID and Wallet are required.' }, { status: 400 });
      }

      const loan = await Loan.findById(loanId);
      if (!loan) {
        return NextResponse.json({ error: 'Loan not found.' }, { status: 400 });
      }
      if (loan.resolved) {
        return NextResponse.json({ error: 'Loan is already resolved.' }, { status: 400 });
      }

      const targetWallet = await Wallet.findOne({ name: wallet });
      if (!targetWallet) {
        return NextResponse.json({ error: `Wallet ${wallet} not found.` }, { status: 400 });
      }

      // Update wallets:
      // Resolving Receivable (getting money back) => adds to wallet.
      // Resolving Payable (paying back what you owe) => deducts from wallet.
      if (loan.type === 'Receivable') {
        targetWallet.balance += loan.amount;
      } else {
        if (targetWallet.balance < loan.amount) {
          return NextResponse.json({ error: `Insufficient balance in ${wallet} to pay back this loan.` }, { status: 400 });
        }
        targetWallet.balance -= loan.amount;
      }

      loan.resolved = true;
      await loan.save();
      await targetWallet.save();

      return NextResponse.json({ success: true, loan });
    }

    // 3. Wallet to Wallet Transfer
    if (action === 'transfer') {
      if (!fromWallet || !toWallet || !amount) {
        return NextResponse.json({ error: 'From, To, and Amount are required.' }, { status: 400 });
      }
      if (fromWallet === toWallet) {
        return NextResponse.json({ error: 'Cannot transfer to the same wallet.' }, { status: 400 });
      }

      const parsedAmount = Number(amount);

      const sourceWallet = await Wallet.findOne({ name: fromWallet });
      const destWallet = await Wallet.findOne({ name: toWallet });

      if (!sourceWallet || !destWallet) {
        return NextResponse.json({ error: 'One or both wallets not found.' }, { status: 400 });
      }

      if (sourceWallet.balance < parsedAmount) {
        return NextResponse.json({ error: `Insufficient funds in ${fromWallet} wallet.` }, { status: 400 });
      }

      // Execute transfer
      sourceWallet.balance -= parsedAmount;
      destWallet.balance += parsedAmount;

      await sourceWallet.save();
      await destWallet.save();

      const transfer = await WalletTransfer.create({
        fromWallet,
        toWallet,
        amount: parsedAmount,
        date: parsedDate
      });

      return NextResponse.json({ success: true, transfer });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
