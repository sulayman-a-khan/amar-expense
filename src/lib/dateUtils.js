export function formatGlobalDate(dateStringOrObject) {
  if (!dateStringOrObject) return '';
  const date = new Date(dateStringOrObject);
  if (isNaN(date)) return '';

  const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
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

export function isWithin48Hours(dateStringOrObject) {
  if (!dateStringOrObject) return false;
  const date = new Date(dateStringOrObject);
  if (isNaN(date)) return false;

  const now = new Date();
  const diffInMs = now - date;
  const diffInHours = diffInMs / (1000 * 60 * 60);
  
  return diffInHours <= 48;
}
