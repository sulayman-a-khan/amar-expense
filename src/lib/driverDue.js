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

  const lastCollection = await DailyCollection.findOne({ bikeId: bike._id }).sort({ date: -1 }).lean();

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

  // Guard against a race with a real entry landing in between — one query
  // for the whole range instead of one findOne per missing day.
  const alreadyExisting = await DailyCollection.find({
    bikeId: bike._id,
    date: { $gte: missingDates[0], $lte: missingDates[missingDates.length - 1] },
  }).select('date').lean();
  const existingDateKeys = new Set(alreadyExisting.map((c) => c.date.toISOString()));
  const datesToCreate = missingDates.filter((d) => !existingDateKeys.has(d.toISOString()));
  if (datesToCreate.length === 0) return;

  let dueDoc = await DriverDue.findOne({ bikeId: bike._id });
  if (!dueDoc) dueDoc = await DriverDue.create({ bikeId: bike._id, balance: 0 });

  // Compute the whole batch's collections + running due balance in memory
  // (no DB round-trips), then write it all in a handful of bulk calls.
  let runningBalance = dueDoc.balance;
  const collectionDocs = datesToCreate.map((date) => ({
    bikeId: bike._id,
    date,
    shift: 'Full Day',
    expectedRent: bike.dailyRent,
    paidRent: 0,
    offDayReason: 'N/A',
  }));

  const insertedCollections = await DailyCollection.insertMany(collectionDocs, { ordered: true });

  const dueEntryDocs = insertedCollections.map((collection) => {
    runningBalance += bike.dailyRent;
    return {
      bikeId: bike._id,
      dailyCollectionId: collection._id,
      type: 'shortfall',
      amount: bike.dailyRent,
      balanceAfter: runningBalance,
      note: `Auto-marked Not Given (no entry recorded) on ${collection.date.toISOString().split('T')[0]}`,
      date: collection.date,
    };
  });

  await Promise.all([
    DriverDue.updateOne(
      { _id: dueDoc._id },
      { $inc: { balance: bike.dailyRent * datesToCreate.length }, $set: { updatedAt: new Date() } }
    ),
    DriverDueEntry.insertMany(dueEntryDocs, { ordered: true }),
  ]);
}
