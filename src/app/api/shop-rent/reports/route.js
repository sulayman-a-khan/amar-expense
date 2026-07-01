import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { MonthlyRentRecord, RentWithdrawal } from '@/models/models';
import { getOrCreateRentSource } from '@/lib/shopRent';

// GET /api/shop-rent/reports?type=yearly&year=2026
// GET /api/shop-rent/reports?type=monthly&year=2026&month=6
// GET /api/shop-rent/reports?type=summary  -> all-time totals across every record
export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const rentSource = await getOrCreateRentSource();

    if (type === 'monthly') {
      const year = Number(searchParams.get('year'));
      const month = Number(searchParams.get('month'));
      if (!year || !month) {
        return NextResponse.json({ error: 'Year and month are required for a monthly report.' }, { status: 400 });
      }
      const record = await MonthlyRentRecord.findOne({ rentSourceId: rentSource._id, year, month });
      if (!record) {
        return NextResponse.json({ error: 'No record exists for that month yet.' }, { status: 404 });
      }
      const withdrawals = await RentWithdrawal.find({ monthlyRentRecordId: record._id }).sort({ date: -1 });
      const collectionRate = record.totalExpected > 0
        ? Math.min(100, Math.round((record.totalReceived / record.totalExpected) * 100))
        : 100;

      return NextResponse.json({ type: 'monthly', record, withdrawals, collectionRate });
    }

    if (type === 'yearly') {
      const year = Number(searchParams.get('year'));
      if (!year) {
        return NextResponse.json({ error: 'Year is required for a yearly report.' }, { status: 400 });
      }
      const records = await MonthlyRentRecord.find({ rentSourceId: rentSource._id, year }).sort({ month: 1 });

      const totalExpected = records.reduce((sum, r) => sum + r.totalExpected, 0);
      const totalReceived = records.reduce((sum, r) => sum + r.totalReceived, 0);
      const collectionRate = totalExpected > 0 ? Math.min(100, Math.round((totalReceived / totalExpected) * 100)) : 0;
      // Outstanding/advance for the year is best represented by the final
      // month's running balance, not a sum across months (since each
      // month's carry-forward/advance already folds the previous one in).
      const lastMonth = records[records.length - 1];
      const outstandingBalance = lastMonth && lastMonth.remainingBalance > 0 ? lastMonth.remainingBalance : 0;
      const advanceBalance = lastMonth && lastMonth.remainingBalance < 0 ? -lastMonth.remainingBalance : 0;

      return NextResponse.json({
        type: 'yearly',
        year,
        months: records,
        totals: { totalExpected, totalReceived, collectionRate, outstandingBalance, advanceBalance },
      });
    }

    // 'summary': all-time totals across every month ever recorded.
    const allRecords = await MonthlyRentRecord.find({ rentSourceId: rentSource._id }).sort({ year: 1, month: 1 });
    const totalExpected = allRecords.reduce((sum, r) => sum + r.totalExpected, 0);
    const totalReceived = allRecords.reduce((sum, r) => sum + r.totalReceived, 0);
    const collectionRate = totalExpected > 0 ? Math.min(100, Math.round((totalReceived / totalExpected) * 100)) : 0;
    const lastMonth = allRecords[allRecords.length - 1];
    const outstandingBalance = lastMonth && lastMonth.remainingBalance > 0 ? lastMonth.remainingBalance : 0;
    const advanceBalance = lastMonth && lastMonth.remainingBalance < 0 ? -lastMonth.remainingBalance : 0;

    return NextResponse.json({
      type: 'summary',
      totalMonthsTracked: allRecords.length,
      totals: { totalExpected, totalReceived, collectionRate, outstandingBalance, advanceBalance },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
