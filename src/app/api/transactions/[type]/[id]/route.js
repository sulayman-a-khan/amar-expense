import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DailyCollection, Expense, IncomeSource, Wallet, DriverDueEntry, Bike, BikeRentPayment, BikeMonthlyRentRecord } from '@/models/models';
import { isWithin48Hours } from '@/lib/dateUtils';
import { recalcDriverDue } from '@/lib/driverDueRecalc';
import { markDateForManualReentry } from '@/lib/driverDue';

// Helper to revert wallet balance
async function revertWalletBalance(walletName, amount, operation) {
  if (!walletName || amount === 0) return;
  // operation: 'income' (increases wallet normally) -> revert decreases it
  // operation: 'expense' (decreases wallet normally) -> revert increases it
  const adjustment = operation === 'income' ? -amount : amount;
  await Wallet.findOneAndUpdate(
    { name: walletName },
    { $inc: { balance: adjustment } }
  );
}

export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { type, id } = await params;

    let targetDoc;
    let operation;
    let walletName = 'Pocket';

    if (type === 'DailyCollection') {
      targetDoc = await DailyCollection.findById(id);
      operation = 'income';
      walletName = 'Pocket'; // bike rent income always credits Pocket in this system
    } else if (type === 'IncomeSource') {
      targetDoc = await IncomeSource.findById(id);
      operation = 'income';
      walletName = targetDoc?.wallet || 'Pocket';
    } else if (type === 'Expense') {
      targetDoc = await Expense.findById(id);
      operation = 'expense';
      walletName = targetDoc?.wallet || 'Pocket';
    } else if (type === 'BikeRentPayment') {
      targetDoc = await BikeRentPayment.findById(id);
      operation = 'income';
      walletName = targetDoc?.wallet || 'Pocket';
    } else {
      return NextResponse.json({ error: 'Unsupported transaction type' }, { status: 400 });
    }

    if (!targetDoc) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (!isWithin48Hours(targetDoc.createdAt)) {
      return NextResponse.json({ error: 'Cannot delete entries older than 48 hours' }, { status: 403 });
    }

    // Revert balance
    const amount = type === 'DailyCollection' ? targetDoc.paidRent : targetDoc.amount;
    
    // Only revert if it's not a credit expense
    if (type !== 'Expense' || !targetDoc.isCredit) {
      await revertWalletBalance(walletName, amount, operation);
    }

    // Delete document
    if (type === 'DailyCollection') {
      await DailyCollection.findByIdAndDelete(id);

      // A collection can have a linked shortfall (added to due) or
      // clearance (paid down due) entry. If we don't remove it and
      // recompute, the bike's due balance and history stay wrong forever —
      // this was the bug where deleting an old entry with a due impact
      // didn't update the amount shown in the bike details modal.
      const linkedEntry = await DriverDueEntry.findOne({ dailyCollectionId: id });
      if (linkedEntry) {
        await DriverDueEntry.findByIdAndDelete(linkedEntry._id);
        await recalcDriverDue(targetDoc.bikeId);

        // Only Shajahan Kaka's bike auto-fills "Not Given" days — give this
        // specific date a grace window so it doesn't get silently recreated
        // before there's a chance to type in the real amount.
        const bikeDoc = await Bike.findById(targetDoc.bikeId).lean();
        if (bikeDoc?.isShajahanKaka) {
          await markDateForManualReentry(targetDoc.bikeId, targetDoc.date);
        }
      }
    }
    else if (type === 'BikeRentPayment') {
      // Reverse the payment from the parent monthly record, then recalculate
      // its remaining balance and status so the bike details modal shows the
      // correct state after deletion.
      const monthRecord = await BikeMonthlyRentRecord.findById(targetDoc.bikeMonthlyRentRecordId);
      if (monthRecord) {
        monthRecord.totalReceived = Math.max(0, monthRecord.totalReceived - targetDoc.amount);
        monthRecord.remainingBalance = monthRecord.rentAmount - monthRecord.totalReceived;
        if (monthRecord.remainingBalance <= 0) {
          monthRecord.status = 'Paid';
        } else if (monthRecord.totalReceived > 0) {
          monthRecord.status = 'Partial';
        } else {
          // No money received at all — revert to time-based status
          const now = new Date();
          monthRecord.status = now.getTime() > monthRecord.deadlineDate.getTime() ? 'Overdue' : 'Pending';
          monthRecord.paidAt = null;
        }
        await monthRecord.save();
      }
      await BikeRentPayment.findByIdAndDelete(id);
    }
    else if (type === 'IncomeSource') await IncomeSource.findByIdAndDelete(id);
    else if (type === 'Expense') await Expense.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
