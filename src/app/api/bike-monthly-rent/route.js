import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Bike, BikeMonthlyRentRecord, BikeRentPayment } from '@/models/models';
import { getCurrentMonthStatus, recordMonthlyPayment, currentDhakaCalendarMonth } from '@/lib/bikeMonthlyRent';

// GET /api/bike-monthly-rent?bikeId=... -> current month status + full payment history
export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const bikeId = searchParams.get('bikeId');
    if (!bikeId) {
      return NextResponse.json({ error: 'bikeId is required.' }, { status: 400 });
    }

    const bike = await Bike.findById(bikeId);
    if (!bike) {
      return NextResponse.json({ error: 'Bike not found.' }, { status: 404 });
    }
    if (bike.rentMode !== 'MONTHLY') {
      return NextResponse.json({ error: 'This bike is not on the monthly rent system.' }, { status: 400 });
    }

    const { record, daysRemaining, isOverdue } = await getCurrentMonthStatus(bike);

    const history = await BikeMonthlyRentRecord.find({ bikeId }).sort({ year: -1, month: -1 }).limit(24).lean();
    const payments = await BikeRentPayment.find({ bikeId }).sort({ date: -1, createdAt: -1 }).limit(50).lean();

    return NextResponse.json({
      bike: { _id: bike._id, name: bike.name, driverName: bike.driverName, monthlyRentAmount: bike.monthlyRentAmount },
      currentMonth: { ...record.toObject(), daysRemaining, isOverdue },
      history,
      payments,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: { action: 'payment', bikeId, amount, date, note, wallet, year?, month? }
export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { action, bikeId } = body;

    if (action !== 'payment') {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    if (!bikeId) {
      return NextResponse.json({ error: 'bikeId is required.' }, { status: 400 });
    }

    const bike = await Bike.findById(bikeId);
    if (!bike) {
      return NextResponse.json({ error: 'Bike not found.' }, { status: 404 });
    }
    if (bike.rentMode !== 'MONTHLY') {
      return NextResponse.json({ error: 'This bike is not on the monthly rent system.' }, { status: 400 });
    }

    const { amount, date, note, wallet, year, month } = body;
    const { record, payment } = await recordMonthlyPayment(bike, {
      amount,
      date: date || undefined,
      note,
      wallet: wallet || 'Pocket',
      year,
      month,
    });

    return NextResponse.json({ success: true, record, payment });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
