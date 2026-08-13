import { BikeMonthlyRentRecord, BikeRentPayment, Wallet } from '@/models/models';
import { nowInDhaka, toNoonUTC } from './dateUtils';

// Rent is payable from the 1st through this day (inclusive) of the month.
// After it, if still unpaid, the month counts as Overdue.
export const MONTHLY_RENT_DEADLINE_DAY = 10;

export function currentDhakaCalendarMonth() {
  const d = nowInDhaka();
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function monthKey(year, month) {
  return year * 12 + month;
}

function deadlineDateFor(year, month) {
  return new Date(Date.UTC(year, month - 1, MONTHLY_RENT_DEADLINE_DAY, 12, 0, 0));
}

// Recomputes what a record's status SHOULD be right now, without writing
// anything. Paid stays Paid regardless of date. Partial stays Partial
// (some money received but not fully paid). Otherwise it's Pending
// through the deadline day and Overdue after.
function deriveStatus(record, now = nowInDhaka()) {
  if (record.totalReceived >= record.rentAmount) return 'Paid';
  if (record.totalReceived > 0) {
    // Some money received but not fully paid — Partial, but if past deadline
    // it should also feel overdue (the UI reads isOverdue separately).
    return 'Partial';
  }
  return now.getTime() > record.deadlineDate.getTime() ? 'Overdue' : 'Pending';
}

// Ensures a BikeMonthlyRentRecord exists for (bike, year, month), creating
// it with a snapshot of the bike's current monthlyRentAmount if it doesn't
// exist yet. Also lazily flips Pending -> Overdue once the deadline has
// passed, exactly like the daily system's lazy backfill — no cron job
// needed, it just corrects itself the next time it's read.
export async function ensureBikeMonthRecord(bike, year, month) {
  let record = await BikeMonthlyRentRecord.findOne({ bikeId: bike._id, year, month });

  if (!record) {
    const rentAmt = bike.monthlyRentAmount || 9000;
    record = await BikeMonthlyRentRecord.create({
      bikeId: bike._id,
      year,
      month,
      rentAmount: rentAmt,
      deadlineDate: deadlineDateFor(year, month),
      totalReceived: 0,
      remainingBalance: rentAmt,
      status: 'Pending',
    });
  }

  // Self-heal records created prior to remainingBalance field addition
  const expectedRemaining = Math.max(0, record.rentAmount - (record.totalReceived || 0));
  let needsSave = false;
  if (
    record.remainingBalance === undefined ||
    record.remainingBalance === null ||
    (record.remainingBalance === 0 && record.totalReceived < record.rentAmount && record.status !== 'Paid')
  ) {
    record.remainingBalance = expectedRemaining;
    needsSave = true;
  }

  const freshStatus = deriveStatus(record);
  if (freshStatus !== record.status) {
    record.status = freshStatus;
    needsSave = true;
  }

  if (needsSave) {
    await record.save();
  }

  return record;
}

// Returns { record, daysRemaining, isOverdue } for the CURRENT month —
// the shape the UI needs to show deadline/remaining-days/overdue state.
export async function getCurrentMonthStatus(bike) {
  const { year, month } = currentDhakaCalendarMonth();
  const record = await ensureBikeMonthRecord(bike, year, month);
  const now = nowInDhaka();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = record.status === 'Paid'
    ? 0
    : Math.max(0, Math.ceil((record.deadlineDate.getTime() - now.getTime()) / msPerDay));

  return { record, daysRemaining, isOverdue: record.status === 'Overdue' };
}

// Records a payment against a given month (defaults to the current month),
// crediting the wallet exactly like every other cash-in flow in the app.
// Tracks remaining balance like shop rent — only marks Paid when fully paid.
// Accepts optional shortfallReason and commitmentDate for partial payments.
export async function recordMonthlyPayment(bike, { amount, note = '', date, wallet = 'Pocket', year, month, shortfallReason = '', commitmentDate = null }) {
  const parsedAmount = Number(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    throw new Error('Amount must be a valid positive number.');
  }

  const { year: curYear, month: curMonth } = currentDhakaCalendarMonth();
  const targetYear = year || curYear;
  const targetMonth = month || curMonth;

  if (monthKey(targetYear, targetMonth) > monthKey(curYear, curMonth)) {
    throw new Error('Cannot collect rent for a future month.');
  }

  const record = await ensureBikeMonthRecord(bike, targetYear, targetMonth);

  const targetWallet = await Wallet.findOne({ name: wallet });
  if (!targetWallet) throw new Error(`Wallet ${wallet} not found.`);

  const paymentDate = toNoonUTC(date);
  const payment = await BikeRentPayment.create({
    bikeMonthlyRentRecordId: record._id,
    bikeId: bike._id,
    amount: parsedAmount,
    note,
    wallet,
    shortfallReason: shortfallReason || '',
    commitmentDate: commitmentDate || null,
    date: paymentDate,
  });

  record.totalReceived += parsedAmount;
  record.remainingBalance = record.rentAmount - record.totalReceived;
  if (record.remainingBalance <= 0) {
    record.status = 'Paid';
    record.paidAt = record.paidAt || new Date();
  } else {
    record.status = 'Partial';
  }
  await record.save();

  targetWallet.balance += parsedAmount;
  await targetWallet.save();

  return { record, payment };
}
