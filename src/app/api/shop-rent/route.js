import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { RentSource, MonthlyRentRecord, RentWithdrawal, Wallet } from '@/models/models';
import { ensureMonthlyRecord, getOrCreateRentSource, monthKey } from '@/lib/shopRent';
import { nowInDhaka, toNoonUTC } from '@/lib/dateUtils';

function currentDhakaMonth() {
  const now = nowInDhaka();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

// GET /api/shop-rent?year=2026&month=6
// Defaults to the current real month (Dhaka time) if not specified.
export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const { year: curYear, month: curMonth } = currentDhakaMonth();
    const year = Number(searchParams.get('year')) || curYear;
    const month = Number(searchParams.get('month')) || curMonth;

    const rentSource = await getOrCreateRentSource();

    // Never auto-create months in the future relative to today.
    const isFuture = monthKey(year, month) > monthKey(curYear, curMonth);
    let record = null;
    if (!isFuture) {
      record = await ensureMonthlyRecord(year, month);
    } else {
      record = await MonthlyRentRecord.findOne({ rentSourceId: rentSource._id, year, month });
    }

    const withdrawals = record
      ? await RentWithdrawal.find({ monthlyRentRecordId: record._id }).sort({ date: -1, createdAt: -1 })
      : [];

    // Whether there's any record at all before this month (to know if
    // "previous" navigation has anything to show, vs just being able to
    // auto-create it on demand).
    const hasAnyHistory = await MonthlyRentRecord.exists({ rentSourceId: rentSource._id });

    return NextResponse.json({
      rentSource: { _id: rentSource._id, name: rentSource.name, monthlyRent: rentSource.monthlyRent, wallet: rentSource.wallet },
      record,
      withdrawals,
      year,
      month,
      isFuture,
      isCurrentMonth: year === curYear && month === curMonth,
      hasAnyHistory: !!hasAnyHistory,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: { action: 'withdrawal', year, month, amount, date, note } -> add a collection to that month
// POST: { action: 'updateRent', monthlyRent } -> change the default rent used for future months
export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { action } = body;

    if (action === 'withdrawal') {
      const { year, month, amount, date, note } = body;
      const parsedAmount = Number(amount);

      if (!year || !month || !parsedAmount || parsedAmount <= 0) {
        return NextResponse.json({ error: 'Year, month, and a positive amount are required.' }, { status: 400 });
      }

      // Backdated collections are allowed for any past month (the user may
      // need to log a late entry). This deliberately does NOT recompute
      // carry-forward/advance on any later month that already inherited
      // this month's old remainingBalance — those stay as originally
      // calculated. Only blocking is for genuinely future months, since
      // rent can't be collected for a month that hasn't happened yet.
      const { year: curYear, month: curMonth } = currentDhakaMonth();
      if (monthKey(year, month) > monthKey(curYear, curMonth)) {
        return NextResponse.json({ error: 'Cannot collect rent for a future month.' }, { status: 400 });
      }

      const record = await ensureMonthlyRecord(year, month);
      const rentSource = await getOrCreateRentSource();

      const targetWallet = await Wallet.findOne({ name: rentSource.wallet });
      if (!targetWallet) {
        return NextResponse.json({ error: `Wallet ${rentSource.wallet} not found.` }, { status: 400 });
      }

      const withdrawalDate = toNoonUTC(date);
      const withdrawal = await RentWithdrawal.create({
        monthlyRentRecordId: record._id,
        amount: parsedAmount,
        note: note || '',
        date: withdrawalDate,
      });

      // Update the running totals on the month record.
      record.totalReceived += parsedAmount;
      record.remainingBalance = record.totalExpected - record.totalReceived;
      record.status = record.remainingBalance > 0 ? 'Pending' : record.remainingBalance < 0 ? 'Advance' : 'Completed';
      await record.save();

      // The cash actually received lands in the configured wallet.
      targetWallet.balance += parsedAmount;
      await targetWallet.save();

      return NextResponse.json({ success: true, withdrawal, record });
    }

    if (action === 'updateRent') {
      const { monthlyRent } = body;
      const parsedRent = Number(monthlyRent);
      if (Number.isNaN(parsedRent) || parsedRent <= 0) {
        return NextResponse.json({ error: 'Monthly rent must be a valid positive number.' }, { status: 400 });
      }

      const rentSource = await getOrCreateRentSource();
      rentSource.monthlyRent = parsedRent;
      await rentSource.save();

      return NextResponse.json({ success: true, rentSource });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
