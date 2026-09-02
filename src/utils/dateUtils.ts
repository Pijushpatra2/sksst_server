/**
 * East Africa Time (EAT / Uganda / Africa/Kampala / UTC+3) Date Utilities
 * Ensures consistent timezone conversions and date boundary calculations across all server modules.
 */

export const EAT_TIMEZONE = 'Africa/Kampala';

/**
 * Returns YYYY-MM-DD string according to East Africa Time (EAT) calendar date.
 */
export function getKampalaDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EAT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Returns current timestamp formatted in 12-hour or 24-hour East Africa Time.
 */
export function getKampalaTimeString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: EAT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Returns today's date string (YYYY-MM-DD) in Uganda.
 */
export function getKampalaToday(): string {
  return getKampalaDateString(new Date());
}

/**
 * Returns yesterday's date string (YYYY-MM-DD) in Uganda.
 */
export function getKampalaYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getKampalaDateString(d);
}
