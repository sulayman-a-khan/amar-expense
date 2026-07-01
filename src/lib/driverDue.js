import { DailyCollection, DriverDue, DriverDueEntry } from '@/models/models';
import { toNoonUTC, startOfTodayDhaka } from './dateUtils';

// Shajahan Kaka no longer has a manual "Not Given" button — if a day passes
// with no entry recorded at all, it should automatically count as Not Given
// (i.e. ৳0 paid, full ৳dailyRent shortfall added to his due). This function
// is lazy/idempotent: call it before reading any Shajahan Kaka data and it
// will fill in every day between his last recorded entry (or bike creation)
// and yesterday that's still missing a DailyCollection. It never touches
// today, since today's entry hasn't been decided yet.
export async function backfillMissedDays(bike) {
  if (!bike) return;

  const todayStart = startOfTodayDhaka();

  const lastCollection = await DailyCollection.findOne({ bikeId: bike._id }).sort({ date: -1 });

  let cursor;
  if (lastCollection) {
    cursor = new Date(lastCollection.date);
    cursor.setUTCHours(0, 0, 0, 0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  } else {
    cursor = new Date(bike.createdAt);
    cursor.setUTCHours(0, 0, 0, 0);
  }

  const missingDates = [];
  while (cursor < todayStart) {
    missingDates.push(toNoonUTC(cursor.toISOString().split('T')[0]));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (missingDates.length === 0) return;

  let dueDoc = await DriverDue.findOne({ bikeId: bike._id });
  if (!dueDoc) dueDoc = await DriverDue.create({ bikeId: bike._id, balance: 0 });

  for (const date of missingDates) {
    // Guard against a race with a real entry landing in between.
    const exists = await DailyCollection.findOne({ bikeId: bike._id, date });
    if (exists) continue;

    const collection = await DailyCollection.create({
      bikeId: bike._id,
      date,
      shift: 'Full Day',
      expectedRent: bike.dailyRent,
      paidRent: 0,
      offDayReason: 'N/A',
    });

    dueDoc.balance += bike.dailyRent;
    dueDoc.updatedAt = new Date();
    await dueDoc.save();

    await DriverDueEntry.create({
      bikeId: bike._id,
      dailyCollectionId: collection._id,
      type: 'shortfall',
      amount: bike.dailyRent,
      balanceAfter: dueDoc.balance,
      note: `Auto-marked Not Given (no entry recorded) on ${date.toISOString().split('T')[0]}`,
      date,
    });
  }
}
