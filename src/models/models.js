import mongoose from 'mongoose';

// --- WALLETS ---
const WalletSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['Pocket', 'Drawer'],
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
  },
});

// --- BIKES ---
const BikeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  driverName: { type: String, required: true },
  dailyRent: { type: Number, required: true },
  isShajahanKaka: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// --- DAILY COLLECTIONS (Shift & Off-Day) ---
const DailyCollectionSchema = new mongoose.Schema({
  bikeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  date: { type: Date, required: true },
  shift: {
    type: String,
    enum: ['Full Day', 'Half Day', 'Off Day'],
    required: true,
  },
  expectedRent: { type: Number, required: true },
  paidRent: { type: Number, required: true },
  offDayReason: {
    type: String,
    enum: ['Driver Unavailable', 'Mechanical Issue', 'Police/Others', 'N/A'],
    default: 'N/A',
  },
  createdAt: { type: Date, default: Date.now },
});
DailyCollectionSchema.index({ bikeId: 1, date: 1 });
DailyCollectionSchema.index({ date: 1 });

// --- EXPENSES (Credit & Payable Integration) ---
const ExpenseSchema = new mongoose.Schema({
  category: { type: String, required: true },
  bikeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', default: null },
  amount: { type: Number, required: true },
  note: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  isCredit: { type: Boolean, default: false },
  payableToShop: { type: String, default: '' }, // Shop/mechanic name if credit
  wallet: { type: String, enum: ['Pocket', 'Drawer', ''], default: 'Pocket' },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});
ExpenseSchema.index({ date: 1 });
const LoanSchema = new mongoose.Schema({
  type: { type: String, enum: ['Receivable', 'Payable'], required: true },
  person: { type: String, required: true }, // e.g. Driver name, or Mechanic
  amount: { type: Number, required: true },
  note: { type: String, default: '' },
  resolved: { type: Boolean, default: false },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});
LoanSchema.index({ type: 1, resolved: 1 });
LoanSchema.index({ resolved: 1 });

// --- INCOME SOURCES ---
const IncomeSourceSchema = new mongoose.Schema({
  type: { type: String, enum: ['Daily', 'Irregular'], required: true },
  name: { type: String, required: true }, // e.g. "Tea Stall Sale", etc.
  amount: { type: Number, required: true },
  wallet: { type: String, enum: ['Pocket', 'Drawer'], default: 'Pocket' },
  note: { type: String, default: '' },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});
IncomeSourceSchema.index({ date: 1 });
const DailyClosingSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  closingCash: { type: Number, required: true }, // Verified Cash in Drawer / Safe
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

// --- WALLET TRANSFERS (Helper Log) ---
const WalletTransferSchema = new mongoose.Schema({
  fromWallet: { type: String, enum: ['Pocket', 'Drawer'], required: true },
  toWallet: { type: String, enum: ['Pocket', 'Drawer'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// --- DRIVER DUE (running balance owed by a driver for rent shortfalls) ---
// Separate from Loan/Liabilities by design — this is specifically rent
// shortfall tracking per bike, not a general loan given to/taken from
// someone. One document per bike holds the current running balance;
// DriverDueEntry below logs each individual change for a visible history.
const DriverDueSchema = new mongoose.Schema({
  bikeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true, unique: true },
  balance: { type: Number, required: true, default: 0 }, // amount currently owed by the driver
  updatedAt: { type: Date, default: Date.now },
});

const DriverDueEntrySchema = new mongoose.Schema({
  bikeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  dailyCollectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyCollection', default: null },
  type: { type: String, enum: ['shortfall', 'clearance'], required: true }, // shortfall = added to due, clearance = paid down
  amount: { type: Number, required: true }, // always positive; type determines direction
  balanceAfter: { type: Number, required: true }, // running balance right after this entry, for display
  note: { type: String, default: '' },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});
DriverDueEntrySchema.index({ bikeId: 1, createdAt: -1 });

// --- SHOP RENT TRACKER ---
// A dedicated sub-system inside the Income module for fixed monthly shop
// rent, which (unlike Daily/Irregular income) must track a running
// month-to-month balance with carry-forward and advance handling.

// Singleton-ish config: the rent source itself. monthlyRent is the current
// editable default used when a brand-new month is auto-created; past
// months keep their own snapshot so editing this later never rewrites
// history.
const RentSourceSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'Shop Rent' },
  monthlyRent: { type: Number, required: true, default: 8000 },
  wallet: { type: String, enum: ['Pocket', 'Drawer'], default: 'Pocket' },
  createdAt: { type: Date, default: Date.now },
});

// One document per calendar month. year/month together are unique so a
// month can never be accidentally duplicated. totalReceived/remainingBalance
// are denormalized (kept in sync on every withdrawal) so the dashboard can
// read a month's state in a single query instead of summing withdrawals
// every time.
const MonthlyRentRecordSchema = new mongoose.Schema({
  rentSourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'RentSource', required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 1-12
  monthlyRent: { type: Number, required: true }, // snapshot at time of month creation
  carryForward: { type: Number, required: true, default: 0 }, // inherited unpaid amount from previous month
  advanceBalance: { type: Number, required: true, default: 0 }, // inherited overpayment from previous month
  totalExpected: { type: Number, required: true }, // monthlyRent + carryForward - advanceBalance
  totalReceived: { type: Number, required: true, default: 0 }, // sum of this month's withdrawals
  remainingBalance: { type: Number, required: true, default: 0 }, // totalExpected - totalReceived (can be negative = future advance)
  status: { type: String, enum: ['Pending', 'Completed', 'Advance'], required: true, default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
});
MonthlyRentRecordSchema.index({ rentSourceId: 1, year: 1, month: 1 }, { unique: true });

// Individual collection events within a month — the visible withdrawal history.
const RentWithdrawalSchema = new mongoose.Schema({
  monthlyRentRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthlyRentRecord', required: true },
  amount: { type: Number, required: true },
  note: { type: String, default: '' },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});
RentWithdrawalSchema.index({ monthlyRentRecordId: 1, createdAt: -1 });
RentWithdrawalSchema.index({ date: 1 });
export const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
export const Bike = mongoose.models.Bike || mongoose.model('Bike', BikeSchema);
export const DailyCollection = mongoose.models.DailyCollection || mongoose.model('DailyCollection', DailyCollectionSchema);
export const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
export const Loan = mongoose.models.Loan || mongoose.model('Loan', LoanSchema);
export const IncomeSource = mongoose.models.IncomeSource || mongoose.model('IncomeSource', IncomeSourceSchema);
export const DailyClosing = mongoose.models.DailyClosing || mongoose.model('DailyClosing', DailyClosingSchema);
export const WalletTransfer = mongoose.models.WalletTransfer || mongoose.model('WalletTransfer', WalletTransferSchema);
export const DriverDue = mongoose.models.DriverDue || mongoose.model('DriverDue', DriverDueSchema);
export const DriverDueEntry = mongoose.models.DriverDueEntry || mongoose.model('DriverDueEntry', DriverDueEntrySchema);
export const RentSource = mongoose.models.RentSource || mongoose.model('RentSource', RentSourceSchema);
export const MonthlyRentRecord = mongoose.models.MonthlyRentRecord || mongoose.model('MonthlyRentRecord', MonthlyRentRecordSchema);
export const RentWithdrawal = mongoose.models.RentWithdrawal || mongoose.model('RentWithdrawal', RentWithdrawalSchema);
