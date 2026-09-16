export type TimestampUnit = 'seconds' | 'milliseconds';
export type CalendarZone = 'utc' | 'local';

export function parseTimestamp(value: string, unit: TimestampUnit): Date {
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(value.trim())) throw new Error('Enter a numeric Unix timestamp. Negative values represent dates before 1970.');
  const milliseconds = Number(value) * (unit === 'seconds' ? 1000 : 1);
  if (!Number.isFinite(milliseconds) || Math.abs(milliseconds) > 8_640_000_000_000_000) throw new Error('This timestamp is outside the supported calendar range.');
  const result = new Date(Math.trunc(milliseconds));
  if (Number.isNaN(result.getTime())) throw new Error('This timestamp is not a valid date.');
  return result;
}

export function parseCalendar(value: string, zone: CalendarZone): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value.trim());
  if (!match) throw new Error('Use YYYY-MM-DD HH:mm:ss, with optional milliseconds.');
  const [, y, mo, d, h, mi, se = '0', ms = '0'] = match;
  const values = [+y, +mo - 1, +d, +h, +mi, +se, +(ms.padEnd(3, '0'))];
  const date = new Date(0);
  if (zone === 'utc') {
    date.setUTCFullYear(values[0], values[1], values[2]);
    date.setUTCHours(values[3], values[4], values[5], values[6]);
  } else {
    date.setFullYear(values[0], values[1], values[2]);
    date.setHours(values[3], values[4], values[5], values[6]);
  }
  const actual = zone === 'utc'
    ? [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()]
    : [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()];
  if (actual.some((part, index) => part !== values[index])) throw new Error('This calendar date does not exist. Check the day, time, and daylight-saving transition.');
  return date;
}

export function calendarString(date: Date, zone: CalendarZone): string {
  const parts = zone === 'utc'
    ? [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()]
    : [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()];
  return `${String(parts[0]).padStart(4, '0')}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}T${parts.slice(3, 6).map(n => String(n).padStart(2, '0')).join(':')}.${String(parts[6]).padStart(3, '0')}`;
}

export function describeDate(date: Date, zone = 'UTC'): { seconds: string; milliseconds: string; iso: string; utc: string; zoned: string } {
  let zoned: string;
  try {
    zoned = new Intl.DateTimeFormat('en-GB', { timeZone: zone === 'local' ? undefined : zone, year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, timeZoneName: 'longOffset', hourCycle: 'h23' }).format(date);
  } catch { throw new Error('Enter a valid IANA time zone, such as America/New_York or Asia/Kolkata.'); }
  return { seconds: String(date.getTime() / 1000), milliseconds: String(date.getTime()), iso: date.toISOString(), utc: date.toUTCString(), zoned };
}
