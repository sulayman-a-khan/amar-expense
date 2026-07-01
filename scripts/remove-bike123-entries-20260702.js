// One-off cleanup: remove Bike 01, 02, 03's DailyCollection entries for
// 2026-07-02, and cleanly reverse the side effects that were created along
// with them (Wallet:Pocket balance, DriverDue balance, DriverDueEntry rows).
// Run with: node scripts/remove-bike123-entries-20260702.js
//
// Safe to re-run: if an entry was already removed, it's simply skipped.

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// --- Load .env.local (same pattern as scripts/update-bike3-due.js) ---
const envPath = path.join(__dirname, "..", ".env.local");
const content = fs.readFileSync(envPath, "utf8");

content.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;

  const eq = trimmed.indexOf("=");
  if (eq === -1) return;

  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  process.env[key] = value;
});

// --- Target date: 2 July 2026, stored as noon UTC (see toNoonUTC in src/lib/dateUtils.js) ---
const TARGET_DATE = new Date(Date.UTC(2026, 6, 2, 12, 0, 0)); // month is 0-indexed: 6 = July
const BIKE_NAMES = ["01", "02", "03"];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const Bike = mongoose.model("Bike", new mongoose.Schema({}, { strict: false }), "bikes");
  const DailyCollection = mongoose.model(
    "DailyCollection",
    new mongoose.Schema({}, { strict: false }),
    "dailycollections"
  );
  const DriverDue = mongoose.model(
    "DriverDue",
    new mongoose.Schema({}, { strict: false }),
    "driverdues"
  );
  const DriverDueEntry = mongoose.model(
    "DriverDueEntry",
    new mongoose.Schema({}, { strict: false }),
    "driverdueentries"
  );
  const Wallet = mongoose.model("Wallet", new mongoose.Schema({}, { strict: false }), "wallets");

  const bikes = await Bike.find({ name: { $in: BIKE_NAMES } });
  if (bikes.length === 0) {
    console.log("❌ No bikes found matching names:", BIKE_NAMES.join(", "));
    process.exit(1);
  }

  let totalWalletReversal = 0;
  let removedCount = 0;

  for (const bike of bikes) {
    const collection = await DailyCollection.findOne({ bikeId: bike._id, date: TARGET_DATE });

    if (!collection) {
      console.log(`ℹ️  Bike ${bike.name}: no entry found for 2026-07-02, skipping.`);
      continue;
    }

    // Reverse any DriverDueEntry created from this collection, and undo its
    // effect on the running DriverDue balance.
    const dueEntries = await DriverDueEntry.find({ dailyCollectionId: collection._id });
    if (dueEntries.length > 0) {
      const dueDoc = await DriverDue.findOne({ bikeId: bike._id });
      for (const entry of dueEntries) {
        if (dueDoc) {
          if (entry.type === "shortfall") {
            dueDoc.balance -= entry.amount; // undo the added shortfall
          } else if (entry.type === "clearance") {
            dueDoc.balance += entry.amount; // undo the cleared amount
          }
        }
        await DriverDueEntry.deleteOne({ _id: entry._id });
      }
      if (dueDoc) {
        dueDoc.balance = Math.max(0, dueDoc.balance); // guard against drift below 0
        dueDoc.updatedAt = new Date();
        await dueDoc.save();
      }
    }

    // Reverse the cash that was added to Pocket when this entry was created.
    if (collection.paidRent > 0) {
      totalWalletReversal += collection.paidRent;
    }

    await DailyCollection.deleteOne({ _id: collection._id });
    removedCount += 1;
    console.log(
      `✅ Bike ${bike.name}: removed entry (shift: ${collection.shift}, paid: ৳${collection.paidRent}), ` +
      `reversed ${dueEntries.length} due entr${dueEntries.length === 1 ? "y" : "ies"}.`
    );
  }

  if (totalWalletReversal > 0) {
    await Wallet.findOneAndUpdate(
      { name: "Pocket" },
      { $inc: { balance: -totalWalletReversal } }
    );
    console.log(`✅ Pocket wallet reduced by ৳${totalWalletReversal} to reverse the removed collections.`);
  }

  console.log(`\nDone. ${removedCount} entr${removedCount === 1 ? "y" : "ies"} removed for 2026-07-02.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
