import { DriverDue, DriverDueEntry } from '@/models/models';

// Recomputes a bike's entire DriverDue balance + every DriverDueEntry's
// balanceAfter from scratch, in chronological order. Call this any time a
// DriverDueEntry is removed (e.g. its DailyCollection got deleted) — the
// remaining entries' snapshots would otherwise still reflect a balance
// chain that includes the deleted one.
//
// This is intentionally a full recompute rather than a single subtract/add,
// because deleting an entry from the middle of the timeline shifts every
// later entry's balanceAfter, not just the running total.
export async function recalcDriverDue(bikeId) {
  const entries = await DriverDueEntry.find({ bikeId }).sort({ date: 1, createdAt: 1 });

  let running = 0;
  const bulkOps = [];
  for (const entry of entries) {
    running += entry.type === 'shortfall' ? entry.amount : -entry.amount;
    if (entry.balanceAfter !== running) {
      bulkOps.push({
        updateOne: { filter: { _id: entry._id }, update: { $set: { balanceAfter: running } } },
      });
    }
  }
  if (bulkOps.length > 0) await DriverDueEntry.bulkWrite(bulkOps);

  await DriverDue.findOneAndUpdate(
    { bikeId },
    { balance: running, updatedAt: new Date() },
    { upsert: true }
  );

  return running;
}
