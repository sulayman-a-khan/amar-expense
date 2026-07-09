// One-time cleanup for the "delete didn't reverse due" bug.
//
// Before the fix, deleting a DailyCollection that had a linked due
// shortfall/clearance left the DriverDueEntry behind and never adjusted
// DriverDue.balance. This script:
//   1. Finds every DriverDueEntry whose linked DailyCollection no longer
//      exists (i.e. it was deleted before the fix) and removes it.
//   2. Recalculates every bike's DriverDue.balance and every remaining
//      entry's balanceAfter from scratch, in chronological order.
//
// It's safe to re-run — step 2 is idempotent, and step 1 only ever removes
// entries that are already orphaned (their DailyCollection is gone).
//
// USAGE (from the project root, with your real .env.local in place):
//   node scripts/fix-due-balances.js
//
// To just see what it WOULD change without writing anything, add --dry-run:
//   node scripts/fix-due-balances.js --dry-run

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// --- Load MONGODB_URI from .env.local without needing the dotenv package ---
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const DRY_RUN = process.argv.includes('--dry-run');

// --- Minimal schemas matching src/models/models.js (only fields we need) ---
const DailyCollectionSchema = new mongoose.Schema({}, { strict: false });
const DriverDueSchema = new mongoose.Schema({}, { strict: false });
const DriverDueEntrySchema = new mongoose.Schema({}, { strict: false });
const BikeSchema = new mongoose.Schema({}, { strict: false });

const DailyCollection = mongoose.model('DailyCollection', DailyCollectionSchema);
const DriverDue = mongoose.model('DriverDue', DriverDueSchema);
const DriverDueEntry = mongoose.model('DriverDueEntry', DriverDueEntrySchema);
const Bike = mongoose.model('Bike', BikeSchema);

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not found. Make sure .env.local exists in the project root.');
    process.exit(1);
  }

  console.log(DRY_RUN ? 'Running in DRY-RUN mode — nothing will be written.\n' : 'Running for real — this will modify your database.\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  // Step 1: find and remove orphaned DriverDueEntry docs.
  const allEntries = await DriverDueEntry.find({ dailyCollectionId: { $ne: null } });
  const orphaned = [];
  for (const entry of allEntries) {
    const collectionExists = await DailyCollection.exists({ _id: entry.dailyCollectionId });
    if (!collectionExists) orphaned.push(entry);
  }

  const orphanedIds = new Set(orphaned.map((e) => e._id.toString()));

  if (orphaned.length === 0) {
    console.log('No orphaned due entries found.');
  } else {
    console.log(`Found ${orphaned.length} orphaned due entry(ies) (linked to a deleted collection):`);
    for (const entry of orphaned) {
      console.log(`  - bikeId=${entry.bikeId} type=${entry.type} amount=${entry.amount} date=${entry.date?.toISOString?.().split('T')[0]} note="${entry.note}"`);
    }
    if (!DRY_RUN) {
      const ids = orphaned.map((e) => e._id);
      await DriverDueEntry.deleteMany({ _id: { $in: ids } });
      console.log(`Deleted ${orphaned.length} orphaned entry(ies).`);
    }
  }

  // Step 2: recalc every bike's due balance + entry chain from scratch.
  // Orphaned entries are excluded from this calculation even in dry-run —
  // otherwise the preview would show the balance as if they were still
  // there, which isn't the real end state once they're actually deleted.
  const bikes = await Bike.find({});
  console.log(`\nRecalculating due balances for ${bikes.length} bike(s)...`);

  for (const bike of bikes) {
    const entries = (await DriverDueEntry.find({ bikeId: bike._id }).sort({ date: 1, createdAt: 1 }))
      .filter((entry) => !orphanedIds.has(entry._id.toString()));

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

    const existingDue = await DriverDue.findOne({ bikeId: bike._id });
    const before = existingDue?.balance ?? 0;
    const changed = before !== running;

    console.log(
      `  ${bike.name || bike._id}: ${before} -> ${running}${changed ? '  (CHANGED)' : ''}` +
      (bulkOps.length ? ` [${bulkOps.length} entry balanceAfter fix(es)]` : '')
    );

    if (!DRY_RUN) {
      if (bulkOps.length > 0) await DriverDueEntry.bulkWrite(bulkOps);
      await DriverDue.findOneAndUpdate(
        { bikeId: bike._id },
        { balance: running, updatedAt: new Date() },
        { upsert: true }
      );
    }
  }

  console.log(DRY_RUN ? '\nDry run complete. Re-run without --dry-run to apply.' : '\nDone. All due balances are now recalculated.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
