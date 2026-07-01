/**
 * ONE-TIME RESET + SEED SCRIPT
 * -----------------------------
 * Wipes every collection used by the app and inserts a fresh starting
 * state, as if the app was just launched today.
 *
 * Run it from the project root with:
 *   node scripts/reset-and-seed.js
 *
 * It reads MONGODB_URI from .env.local automatically (same file the app
 * itself uses) — no extra setup needed.
 *
 * SAFETY: this permanently deletes ALL existing data (bikes, collections,
 * expenses, loans, income, closings, transfers, driver dues, shop rent
 * history). There is no undo. Only run this once, intentionally.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// --- Load .env.local (simple parser, no extra dependency needed) ---
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}
loadEnvLocal();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found. Make sure .env.local exists in the project root.');
  process.exit(1);
}

// --- Schemas (kept in sync with src/models/models.js) ---
const WalletSchema = new mongoose.Schema({
  name: { type: String, enum: ['Pocket', 'Drawer'], required: true, unique: true },
  balance: { type: Number, required: true, default: 0 },
});
const BikeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  driverName: { type: String, required: true },
  dailyRent: { type: Number, required: true },
  isShajahanKaka: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const DailyCollectionSchema = new mongoose.Schema({}, { strict: false });
const ExpenseSchema = new mongoose.Schema({}, { strict: false });
const LoanSchema = new mongoose.Schema({}, { strict: false });
const IncomeSourceSchema = new mongoose.Schema({}, { strict: false });
const DailyClosingSchema = new mongoose.Schema({}, { strict: false });
const WalletTransferSchema = new mongoose.Schema({}, { strict: false });
const DriverDueSchema = new mongoose.Schema({
  bikeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true, unique: true },
  balance: { type: Number, required: true, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});
const DriverDueEntrySchema = new mongoose.Schema({}, { strict: false });
const RentSourceSchema = new mongoose.Schema({}, { strict: false });
const MonthlyRentRecordSchema = new mongoose.Schema({}, { strict: false });
const RentWithdrawalSchema = new mongoose.Schema({}, { strict: false });

const Wallet = mongoose.model('Wallet', WalletSchema);
const Bike = mongoose.model('Bike', BikeSchema);
const DailyCollection = mongoose.model('DailyCollection', DailyCollectionSchema);
const Expense = mongoose.model('Expense', ExpenseSchema);
const Loan = mongoose.model('Loan', LoanSchema);
const IncomeSource = mongoose.model('IncomeSource', IncomeSourceSchema);
const DailyClosing = mongoose.model('DailyClosing', DailyClosingSchema);
const WalletTransfer = mongoose.model('WalletTransfer', WalletTransferSchema);
const DriverDue = mongoose.model('DriverDue', DriverDueSchema);
const DriverDueEntry = mongoose.model('DriverDueEntry', DriverDueEntrySchema);
const RentSource = mongoose.model('RentSource', RentSourceSchema);
const MonthlyRentRecord = mongoose.model('MonthlyRentRecord', MonthlyRentRecordSchema);
const RentWithdrawal = mongoose.model('RentWithdrawal', RentWithdrawalSchema);

// ============ EDIT THESE BEFORE RUNNING IF YOU WANT DIFFERENT STARTING VALUES ============
const STARTING_DATA = {
  pocketBalance: 780,
  drawerBalance: 0,
  bikes: [
    {
      name: 'Bike 1',
      driverName: 'Kobir',
      dailyRent: 450,
      isShajahanKaka: false,
      openingDue: 950,
    },
    {
      name: 'Bike 2',
      driverName: 'Lebu',
      dailyRent: 450,
      isShajahanKaka: false,
      openingDue: 4000,
    },
    {
      name: 'Bike 3',
      driverName: 'Rakib',
      dailyRent: 400,
      isShajahanKaka: false,
      openingDue: 0,
    },
    {
      name: 'Shajahan Kaka Bike', // placeholder name — edit in the app later
      driverName: 'Shajahan Kaka',
      dailyRent: 100,
      isShajahanKaka: true,
      openingDue: 300,
    },
  ],
};
// ==========================================================================================

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  console.log('Wiping all existing data...');
  await Promise.all([
    Wallet.deleteMany({}),
    Bike.deleteMany({}),
    DailyCollection.deleteMany({}),
    Expense.deleteMany({}),
    Loan.deleteMany({}),
    IncomeSource.deleteMany({}),
    DailyClosing.deleteMany({}),
    WalletTransfer.deleteMany({}),
    DriverDue.deleteMany({}),
    DriverDueEntry.deleteMany({}),
    RentSource.deleteMany({}),
    MonthlyRentRecord.deleteMany({}),
    RentWithdrawal.deleteMany({}),
  ]);
  console.log('All collections cleared.\n');

  console.log('Seeding wallets...');
  await Wallet.create([
    { name: 'Pocket', balance: STARTING_DATA.pocketBalance },
    { name: 'Drawer', balance: STARTING_DATA.drawerBalance },
  ]);
  console.log(`  Pocket = ${STARTING_DATA.pocketBalance}`);
  console.log(`  Drawer = ${STARTING_DATA.drawerBalance}\n`);

  console.log('Seeding bikes + opening dues...');
  const now = new Date();
  for (const b of STARTING_DATA.bikes) {
    const bike = await Bike.create({
      name: b.name,
      driverName: b.driverName,
      dailyRent: b.dailyRent,
      isShajahanKaka: b.isShajahanKaka,
      createdAt: now, // "today" — prevents auto-backfill from touching past days
    });

    const dueDoc = await DriverDue.create({
      bikeId: bike._id,
      balance: b.openingDue,
      updatedAt: now,
    });

    await DriverDueEntry.create({
      bikeId: bike._id,
      dailyCollectionId: null,
      type: 'shortfall',
      amount: b.openingDue,
      balanceAfter: dueDoc.balance,
      note: 'Opening balance (app launch)',
      date: now,
    });

    console.log(`  ${b.name} (${b.driverName}) — due ${b.openingDue}`);
  }

  console.log('\nDone. Database is reset to a fresh starting state.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
