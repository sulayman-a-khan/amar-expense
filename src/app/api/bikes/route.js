import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Bike, DailyCollection, Wallet, Loan } from '@/models/models';

export async function GET() {
  try {
    await connectToDatabase();
    const bikes = await Bike.find({});
    return NextResponse.json({ bikes });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectToDatabase();
    const { id, name, driver, dailyRent } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Bike id is required.' }, { status: 400 });
    }

    const updates = {};
    if (name !== undefined && name !== '') updates.name = name;
    if (driver !== undefined && driver !== '') updates.driverName = driver;
    if (dailyRent !== undefined && dailyRent !== '') {
      const parsedRent = Number(dailyRent);
      if (Number.isNaN(parsedRent) || parsedRent < 0) {
        return NextResponse.json({ error: 'Daily rent must be a valid positive number.' }, { status: 400 });
      }
      updates.dailyRent = parsedRent;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const updated = await Bike.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) {
      return NextResponse.json({ error: 'Bike not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, bike: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { action, bikeId, date, shift, paidRent, offDayReason } = body;

    if (action === 'collection') {
      const bike = await Bike.findById(bikeId);
      if (!bike) {
        return NextResponse.json({ error: 'Bike not found' }, { status: 404 });
      }

      let expectedRent = bike.dailyRent;
      if (shift === 'Half Day') expectedRent *= 0.5;
      if (shift === 'Off Day') expectedRent = 0;

      const collectionDate = new Date(date || new Date());
      collectionDate.setHours(12, 0, 0, 0);

      const finalPaidRent = Number(paidRent || 0);

      const collection = await DailyCollection.create({
        bikeId,
        date: collectionDate,
        shift,
        expectedRent,
        paidRent: finalPaidRent,
        offDayReason: shift === 'Off Day' ? offDayReason : 'N/A'
      });

      if (finalPaidRent > 0) {
        await Wallet.findOneAndUpdate(
          { name: 'Business' },
          { $inc: { balance: finalPaidRent } }
        );
      }

      // Off-day/short-pay tracking: if driver paid less than the day's expected
      // rent (e.g. Half Day shortfall, or any unpaid Off-Day rent agreed to be
      // covered later), log the shortfall as a Receivable owed by the driver.
      const shortfall = expectedRent - finalPaidRent;
      if (shortfall > 0) {
        await Loan.create({
          type: 'Receivable',
          person: bike.driverName,
          amount: shortfall,
          note: `Rent shortfall — ${shift} on ${collectionDate.toISOString().split('T')[0]} (Bike ${bike.name})${shift === 'Off Day' ? `: ${offDayReason}` : ''}`,
          date: collectionDate,
          resolved: false
        });
      }

      return NextResponse.json({ success: true, collection, shortfall: shortfall > 0 ? shortfall : 0 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
