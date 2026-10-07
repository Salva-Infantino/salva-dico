/**
 * Gemini's free-tier daily quotas reset at midnight Pacific time. Computed with Intl so
 * the result stays right when either time zone changes between summer and winter time.
 */
const PACIFIC = 'America/Los_Angeles';

function partsIn(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

/** Offset of `timeZone` from UTC at `date`, in milliseconds (negative west of Greenwich). */
function offsetMs(date: Date, timeZone: string): number {
  const p = partsIn(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The next midnight in Pacific time after `now`. */
export function nextQuotaReset(now: Date): Date {
  const today = partsIn(now, PACIFIC);
  const midnightAsUtc = Date.UTC(today.year, today.month - 1, today.day + 1);
  // The offset can differ at midnight on the day the clocks change: measure it there.
  const guess = midnightAsUtc - offsetMs(now, PACIFIC);
  return new Date(midnightAsUtc - offsetMs(new Date(guess), PACIFIC));
}

/** "9 h" or "8 h 30", in the user's time zone (or `timeZone`, for tests). */
export function formatResetTime(date: Date, timeZone?: string): string {
  const { hour, minute } = partsIn(
    date,
    timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  return minute === 0
    ? `${String(hour)} h`
    : `${String(hour)} h ${String(minute).padStart(2, '0')}`;
}
