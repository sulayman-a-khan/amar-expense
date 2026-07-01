const APP_TIMEZONE = 'Asia/Dhaka';

// Returns a Date object whose UTC fields represent the current wall-clock
// time in Dhaka (UTC+6, no DST). This lets the rest of the app keep using
// plain Date methods (getUTCFullYear, setUTCHours, etc.) while still being
// anchored to Dhaka time regardless of what timezone the server itself runs in
// (e.g. Vercel's servers run in UTC, a local dev machine could be anything).
export function nowInDhaka() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const map = {};
  parts.forEach((p) => { map[p.type] = p.value; });

  // Intl can report hour "24" for midnight in hour12:false mode — normalize to 0.
  const hour = Number(map.hour) === 24 ? 0 : Number(map.hour);

  return new Date(Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    hour, Number(map.minute), Number(map.second)
  ));
}

// Start of "today" (00:00:00) in Dhaka time, returned as a real Date/Instant
// safe to use in Mongo range queries ({ $gte: ... }).
export function startOfTodayDhaka() {
  const d = nowInDhaka();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Given any date-ish input (Date, ISO string, or plain "YYYY-MM-DD" string
// from a date picker), returns a Date set to noon UTC on that same calendar
// day. Noon is used (not midnight) so the stored instant never crosses into
// a different calendar day no matter what timezone later reads it back in —
// this is how "the date of this entry" should be stored, separate from
// `createdAt` (which is a real timestamp of when the record was inserted).
export function toNoonUTC(dateInput) {
  if (!dateInput) return toNoonUTC(nowInDhaka());

  // Plain "YYYY-MM-DD" strings (from <input type="date">) must be parsed as
  // calendar-day components directly — new Date("YYYY-MM-DD") parses as UTC
  // midnight already, but going through Date.UTC explicitly avoids any
  // ambiguity if the input ever includes a time portion.
  let year, month, day;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    [year, month, day] = dateInput.split('-').map(Number);
    month -= 1;
  } else {
    const d = new Date(dateInput);
    if (isNaN(d)) return toNoonUTC(nowInDhaka());
    year = d.getUTCFullYear();
    month = d.getUTCMonth();
    day = d.getUTCDate();
  }

  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

// "YYYY-MM-DD" string for today in Dhaka time — use this anywhere a date
// picker needs to default to "today" (e.g. <input type="date" defaultValue>).
export function todayDhakaDateString() {
  return startOfTodayDhaka().toISOString().split('T')[0];
}

// "YYYY-MM-DD" string for yesterday in Dhaka time.
export function yesterdayDhakaDateString() {
  const d = startOfTodayDhaka();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

export function formatGlobalDate(dateStringOrObject) {
  if (!dateStringOrObject) return '';
  const date = new Date(dateStringOrObject);
  if (isNaN(date)) return '';

  const options = { timeZone: APP_TIMEZONE, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(date);
  
  // Output format example: "Wed - 24 Jun 2026"
  let weekday = '', day = '', month = '', year = '';
  parts.forEach(part => {
    if (part.type === 'weekday') weekday = part.value;
    if (part.type === 'day') day = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'year') year = part.value;
  });

  return `${weekday} - ${day} ${month} ${year}`;
}

// --- Shop Rent tracker: custom "month" cycle ---
// The rent month is not the calendar month (1st-to-1st). It runs from
// RENT_CYCLE_START_DAY of one calendar month to the same day of the next
// (e.g. with day 10: 10 Jun through 9 Jul is one rent-cycle "month").
export const RENT_CYCLE_START_DAY = 10;

// Given a Dhaka-time Date, returns the {year, month} label of the rent
// cycle it falls into. Days before RENT_CYCLE_START_DAY still belong to
// the PREVIOUS calendar month's cycle (started on that day last month).
export function getRentCycleLabel(date = nowInDhaka()) {
  const day = date.getUTCDate();
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1; // 1-12
  if (day < RENT_CYCLE_START_DAY) {
    month -= 1;
    if (month === 0) { month = 12; year -= 1; }
  }
  return { year, month };
}

// Returns the actual start (inclusive) / end (exclusive) Date of a rent
// cycle labeled (year, month): starts RENT_CYCLE_START_DAY of `month`,
// ends RENT_CYCLE_START_DAY of the following month.
export function getRentCycleRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, RENT_CYCLE_START_DAY, 12, 0, 0));
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = new Date(Date.UTC(endYear, endMonth - 1, RENT_CYCLE_START_DAY, 12, 0, 0));
  return { start, end };
}

const RENT_CYCLE_SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Display label for a rent cycle, e.g. "10 Jun – 9 Jul 2026".
export function formatRentCycleLabel(year, month) {
  const { start, end } = getRentCycleRange(year, month);
  const lastDay = new Date(end);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  const startStr = `${RENT_CYCLE_START_DAY} ${RENT_CYCLE_SHORT_MONTHS[start.getUTCMonth()]}`;
  const endStr = `${lastDay.getUTCDate()} ${RENT_CYCLE_SHORT_MONTHS[lastDay.getUTCMonth()]}`;
  return `${startStr} – ${endStr} ${lastDay.getUTCFullYear()}`;
}

// nowInDhaka()/startOfTodayDhaka() return "fake-UTC" Dates whose UTC-getter
// fields are actually Dhaka wall-clock digits — convenient for reading
// calendar components, but NOT a real timestamp. Fields like `date` are
// stored via toNoonUTC() using this same fake convention, so comparing them
// directly against startOfTodayDhaka() is fine. But `createdAt` fields
// (default: Date.now()) are REAL timestamps — comparing those directly
// against a fake-Dhaka Date is off by Dhaka's UTC+6 offset and silently
// hides same-day entries for part of the day. Use this to convert first.
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
export function toRealInstant(fakeDhakaDate) {
  return new Date(fakeDhakaDate.getTime() - DHAKA_OFFSET_MS);
}

export function isWithin48Hours(dateStringOrObject) {
  if (!dateStringOrObject) return false;
  const date = new Date(dateStringOrObject);
  if (isNaN(date)) return false;

  const now = new Date();
  const diffInMs = now - date;
  const diffInHours = diffInMs / (1000 * 60 * 60);
  
  return diffInHours <= 48;
}
