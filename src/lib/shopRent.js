import { RentSource, MonthlyRentRecord } from '@/models/models';

// Returns {year, month} for the calendar month immediately after the given one.
function nextMonth(year, month) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

// Numeric key for ordering/comparing (year, month) pairs.
function monthKey(year, month) {
  return year * 12 + month;
}

async function getOrCreateRentSource() {
  let source = await RentSource.findOne({});
  if (!source) {
    source = await RentSource.create({ name: 'Shop Rent', monthlyRent: 8000, wallet: 'Pocket' });
  }
  return source;
}

function computeStatus(remainingBalance) {
  if (remainingBalance > 0) return 'Pending';
  if (remainingBalance < 0) return 'Advance';
  return 'Completed';
}

// Builds a brand-new month record inheriting from the previous month's
// outcome. Does not look at withdrawals (there can't be any yet for a
// month that didn't exist a moment ago).
async function createMonthRecord(rentSourceId, year, month, monthlyRent, inheritedCarryForward, inheritedAdvanceBalance) {
  const totalExpected = monthlyRent + inheritedCarryForward - inheritedAdvanceBalance;
  const remainingBalance = totalExpected; // nothing received yet
  return MonthlyRentRecord.create({
    rentSourceId,
    year,
    month,
    monthlyRent,
    carryForward: inheritedCarryForward,
    advanceBalance: inheritedAdvanceBalance,
    totalExpected,
    totalReceived: 0,
    remainingBalance,
    status: computeStatus(remainingBalance),
  });
}

// Ensures a MonthlyRentRecord exists for (targetYear, targetMonth), creating
// it — and any months skipped in between since the last existing record —
// by chaining each one's carry-forward/advance from its immediate
// predecessor. Existing records are never modified. Returns the record for
// the requested month (existing or newly created).
export async function ensureMonthlyRecord(targetYear, targetMonth) {
  const rentSource = await getOrCreateRentSource();

  const existing = await MonthlyRentRecord.findOne({
    rentSourceId: rentSource._id,
    year: targetYear,
    month: targetMonth,
  });
  if (existing) return existing;

  // Find the most recent record strictly before the target month.
  const allRecords = await MonthlyRentRecord.find({ rentSourceId: rentSource._id });
  const targetKey = monthKey(targetYear, targetMonth);
  const priorRecords = allRecords.filter((r) => monthKey(r.year, r.month) < targetKey);

  if (priorRecords.length === 0) {
    // No history at all yet — the very first month for this rent source.
    return createMonthRecord(rentSource._id, targetYear, targetMonth, rentSource.monthlyRent, 0, 0);
  }

  priorRecords.sort((a, b) => monthKey(a.year, a.month) - monthKey(b.year, b.month));
  let cursor = priorRecords[priorRecords.length - 1]; // most recent existing record

  // Walk forward one month at a time from the cursor, creating every
  // skipped month along the way so each one correctly accumulates
  // carry-forward/advance from its real predecessor, not a stale jump.
  let { year, month } = nextMonth(cursor.year, cursor.month);
  let record = null;
  while (true) {
    const carryForward = cursor.remainingBalance > 0 ? cursor.remainingBalance : 0;
    const advanceBalance = cursor.remainingBalance < 0 ? -cursor.remainingBalance : 0;
    record = await createMonthRecord(rentSource._id, year, month, rentSource.monthlyRent, carryForward, advanceBalance);

    if (year === targetYear && month === targetMonth) break;
    cursor = record;
    ({ year, month } = nextMonth(year, month));
  }

  return record;
}

export { getOrCreateRentSource, monthKey, nextMonth, computeStatus };
