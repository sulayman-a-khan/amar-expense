import mongoose from 'mongoose';

// --- WALLETS ---
const WalletSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['Business', 'Pocket', 'Drawer'],
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

// --- EXPENSES (Credit & Payable Integration) ---
const ExpenseSchema = new mongoose.Schema({
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  note: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  isCredit: { type: Boolean, default: false },
  payableToShop: { type: String, default: '' }, // Shop/mechanic name if credit
  wallet: { type: String, enum: ['Business', 'Pocket', 'Drawer'], default: 'Business' },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// --- LOANS & LIABILITIES (Two-way) ---
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

// --- INCOME SOURCES ---
const IncomeSourceSchema = new mongoose.Schema({
  type: { type: String, enum: ['ShopRent', 'Daily', 'Irregular'], required: true },
  name: { type: String, required: true }, // e.g. "Shop 1 Rent", "Daily Sales", etc.
  amount: { type: Number, required: true },
  wallet: { type: String, enum: ['Business', 'Pocket', 'Drawer'], default: 'Business' },
  note: { type: String, default: '' },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// --- DAILY CLOSINGS ---
const DailyClosingSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  closingCash: { type: Number, required: true }, // Verified Cash in Drawer / Safe
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

// --- WALLET TRANSFERS (Helper Log) ---
const WalletTransferSchema = new mongoose.Schema({
  fromWallet: { type: String, enum: ['Business', 'Pocket', 'Drawer'], required: true },
  toWallet: { type: String, enum: ['Business', 'Pocket', 'Drawer'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Export Models (preventing rebuild compile errors in Next.js Hot Reload)
export const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
export const Bike = mongoose.models.Bike || mongoose.model('Bike', BikeSchema);
export const DailyCollection = mongoose.models.DailyCollection || mongoose.model('DailyCollection', DailyCollectionSchema);
export const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
export const Loan = mongoose.models.Loan || mongoose.model('Loan', LoanSchema);
export const IncomeSource = mongoose.models.IncomeSource || mongoose.model('IncomeSource', IncomeSourceSchema);
export const DailyClosing = mongoose.models.DailyClosing || mongoose.model('DailyClosing', DailyClosingSchema);
export const WalletTransfer = mongoose.models.WalletTransfer || mongoose.model('WalletTransfer', WalletTransferSchema);
