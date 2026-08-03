import { BikeMonthlyRentRecord, BikeRentPayment, Wallet } from '@/models/models';
import { nowInDhaka, toNoonUTC } from './dateUtils';

// Rent is payable from the 1st through this day (inclusive) of the month.
// After it, if still unpaid, the month counts as Overdue.
export const MONTHLY_RENT_DEADLINE_DAY = 12;

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
// anything. Paid stays Paid regardless of date. Otherwise it's Pending
// through the deadline day and Overdue after.
function deriveStatus(record, now = nowInDhaka()) {
  if (record.totalReceived > 0) return 'Paid';
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
    record = await BikeMonthlyRentRecord.create({
      bikeId: bike._id,
      year,
      month,
      rentAmount: bike.monthlyRentAmount || 9000,
      deadlineDate: deadlineDateFor(year, month),
      totalReceived: 0,
      status: 'Pending',
    });
  }

  const freshStatus = deriveStatus(record);
  if (freshStatus !== record.status) {
    record.status = freshStatus;
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
// Marks the month Paid once any payment lands, since the agreement is a
// single flat monthly amount rather than a running balance to chip away at.
export async function recordMonthlyPayment(bike, { amount, note = '', date, wallet = 'Pocket', year, month }) {
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
    date: paymentDate,
  });

  record.totalReceived += parsedAmount;
  record.status = 'Paid';
  record.paidAt = record.paidAt || new Date();
  await record.save();

  targetWallet.balance += parsedAmount;
  await targetWallet.save();

  return { record, payment };
}
