const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const envPath = path.join(__dirname, '..', '.env.local');
const content = fs.readFileSync(envPath, 'utf8');
content.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eq = trimmed.indexOf('=');
  if (eq === -1) return;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
});

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Record = mongoose.model('BikeMonthlyRentRecord', new mongoose.Schema({}, { strict: false }), 'bikemonthlyrentrecords');

  const records = await Record.find({});
  for (const rec of records) {
    const rent = rec.rentAmount || 9000;
    const received = rec.totalReceived || 0;
    const expected = Math.max(0, rent - received);
    if (rec.remainingBalance === undefined || rec.remainingBalance === null || (rec.remainingBalance === 0 && received < rent && rec.status !== 'Paid')) {
      rec.remainingBalance = expected;
      await rec.save();
      console.log(`Updated record ${rec._id}: set remainingBalance = ${expected}`);
    }
  }

  await mongoose.disconnect();
}
main().catch(console.error);
