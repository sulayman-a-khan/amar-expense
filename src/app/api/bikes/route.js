import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Bike, DailyCollection, Wallet, DriverDue, DriverDueEntry } from '@/models/models';
import { toNoonUTC, nowInDhaka } from '@/lib/dateUtils';

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
    const { id, name, driver, dailyRent, rentMode, monthlyRentAmount, driverImage } = await request.json();

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
    if (rentMode !== undefined && rentMode !== '') {
      if (!['DAILY', 'MONTHLY'].includes(rentMode)) {
        return NextResponse.json({ error: 'rentMode must be DAILY or MONTHLY.' }, { status: 400 });
      }
      updates.rentMode = rentMode;
    }
    if (monthlyRentAmount !== undefined && monthlyRentAmount !== '') {
      const parsedMonthly = Number(monthlyRentAmount);
      if (Number.isNaN(parsedMonthly) || parsedMonthly < 0) {
        return NextResponse.json({ error: 'Monthly rent must be a valid positive number.' }, { status: 400 });
      }
      updates.monthlyRentAmount = parsedMonthly;
    }
    if (driverImage !== undefined) {
      // Allow clearing the image (empty string) as well as setting it.
      updates.driverImage = driverImage;
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
    const { action, bikeId, date, shift, paidRent, offDayReason, expectedRent: providedExpectedRent } = body;

    if (action === 'collection') {
      const bike = await Bike.findById(bikeId);
      if (!bike) {
        return NextResponse.json({ error: 'Bike not found' }, { status: 404 });
      }

      // The DAILY collection flow is intentionally kept fully intact (see
      // models.js comment on Bike.rentMode) — it's just not valid for a bike
      // currently on the MONTHLY agreement. Switch the bike back to DAILY
      // mode via Edit Bike to use this again.
      if (bike.rentMode === 'MONTHLY') {
        return NextResponse.json({ error: 'This bike is on the monthly rent system — use the monthly rent payment instead of a daily collection.' }, { status: 400 });
      }

      let expectedRent = bike.dailyRent;
      if (shift === 'Half Day') {
        // Half Day no longer defaults to 50% of the base rent — the actual
        // expected amount for that half-day is entered manually per entry.
        const parsedExpected = Number(providedExpectedRent);
        if (providedExpectedRent === undefined || providedExpectedRent === null || providedExpectedRent === '' || Number.isNaN(parsedExpected) || parsedExpected < 0) {
          return NextResponse.json({ error: 'Expected amount is required for Half Day.' }, { status: 400 });
        }
        expectedRent = parsedExpected;
      }
      if (shift === 'Off Day') expectedRent = 0;

      const collectionDate = toNoonUTC(date);

      // Prevent duplicate entry for same bike on same date
      const existing = await DailyCollection.findOne({ bikeId, date: collectionDate });
      if (existing) {
        return NextResponse.json({ error: 'Entry already exists for this bike on this date.' }, { status: 400 });
      }

      const finalPaidRent = Number(paidRent || 0);

      const collection = await DailyCollection.create({
        bikeId,
        date: collectionDate,
        shift,
        expectedRent,
        paidRent: finalPaidRent,
        offDayReason: shift === 'Off Day' ? offDayReason : 'N/A'
      });

      // The full amount actually handed over always lands in Pocket,
      // regardless of how it nets against today's expected rent or any
      // outstanding due — cash received is cash received.
      if (finalPaidRent > 0) {
        await Wallet.findOneAndUpdate(
          { name: 'Pocket' },
          { $inc: { balance: finalPaidRent } }
        );
      }

      // Driver Due tracking (separate from Loans & Liabilities):
      // - If paid less than expected, the shortfall ADDS to the driver's due.
      // - If paid more than expected, the extra CLEARS existing due (up to
      //   however much due there currently is — extra beyond that is just
      //   a bigger rent payment, not a due adjustment).
      const diff = expectedRent - finalPaidRent; // positive = shortfall, negative = overpaid

      let dueDoc = await DriverDue.findOne({ bikeId });
      if (!dueDoc) {
        dueDoc = await DriverDue.create({ bikeId, balance: 0 });
      }

      if (diff > 0) {
        dueDoc.balance += diff;
        dueDoc.updatedAt = new Date();
        await dueDoc.save();

        await DriverDueEntry.create({
          bikeId,
          dailyCollectionId: collection._id,
          type: 'shortfall',
          amount: diff,
          balanceAfter: dueDoc.balance,
          note: `${shift} on ${collectionDate.toISOString().split('T')[0]} (Bike ${bike.name})${shift === 'Off Day' ? `: ${offDayReason}` : ''}`,
          date: collectionDate,
        });
      } else if (diff < 0 && dueDoc.balance > 0) {
        const overpaid = -diff;
        const cleared = Math.min(overpaid, dueDoc.balance);
        dueDoc.balance -= cleared;
        dueDoc.updatedAt = new Date();
        await dueDoc.save();

        await DriverDueEntry.create({
          bikeId,
          dailyCollectionId: collection._id,
          type: 'clearance',
          amount: cleared,
          balanceAfter: dueDoc.balance,
          note: `Extra payment on ${shift} on ${collectionDate.toISOString().split('T')[0]} (Bike ${bike.name}) cleared ৳${cleared} of due`,
          date: collectionDate,
        });
      }

      return NextResponse.json({
        success: true,
        collection,
        dueBalance: dueDoc.balance,
        shortfall: diff > 0 ? diff : 0
      });
    }

    // Manual due reduction — lets you knock down a driver's outstanding due
    // by hand (e.g. Shajahan Kaka paid off some due in person, in a lump
    // sum, or you're forgiving/adjusting part of it) without it being tied
    // to a specific day's collection. Fully separate from the automatic
    // over/under-payment clearance above, but logged the same way (as a
    // DriverDueEntry with type 'clearance') so it shows up in due history —
    // just with dailyCollectionId left null and a note explaining it was
    // manual.
    if (action === 'manual_due_reduce') {
      const { amount, note } = body;

      const bike = await Bike.findById(bikeId);
      if (!bike) {
        return NextResponse.json({ error: 'Bike not found' }, { status: 404 });
      }

      const parsedAmount = Number(amount);
      if (amount === undefined || amount === null || amount === '' || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'Enter a valid amount to reduce.' }, { status: 400 });
      }

      const dueDoc = await DriverDue.findOne({ bikeId });
      if (!dueDoc || dueDoc.balance <= 0) {
        return NextResponse.json({ error: 'There is no outstanding due to reduce.' }, { status: 400 });
      }

      // Never let a manual reduce push the balance below zero — cap it at
      // whatever is actually owed.
      const reduced = Math.min(parsedAmount, dueDoc.balance);
      dueDoc.balance -= reduced;
      dueDoc.updatedAt = new Date();
      await dueDoc.save();

      const trimmedNote = (note || '').trim();
      const entry = await DriverDueEntry.create({
        bikeId,
        dailyCollectionId: null,
        type: 'clearance',
        amount: reduced,
        balanceAfter: dueDoc.balance,
        note: trimmedNote ? `Manual due reduce: ${trimmedNote}` : 'Manual due reduce',
        date: nowInDhaka(),
      });

      return NextResponse.json({
        success: true,
        dueBalance: dueDoc.balance,
        reduced,
        entry,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
