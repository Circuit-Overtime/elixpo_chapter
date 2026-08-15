const INDIA_TIME_ZONE = 'Asia/Kolkata';

/**
 * Independence Day recurs on 15 August and follows India Standard Time,
 * regardless of the visitor's or server's local time zone.
 */
export function isIndianIndependenceDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: INDIA_TIME_ZONE,
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return month === 8 && day === 15;
}
