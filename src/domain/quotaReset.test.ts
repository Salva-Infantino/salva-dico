import { describe, expect, it } from 'vitest';
import { formatResetTime, nextQuotaReset } from './quotaReset.ts';

describe('nextQuotaReset', () => {
  it('is the next midnight in Pacific summer time (UTC-7)', () => {
    expect(nextQuotaReset(new Date('2026-10-07T15:00:00Z')).toISOString()).toBe(
      '2026-10-08T07:00:00.000Z',
    );
  });

  it('is the next midnight in Pacific winter time (UTC-8)', () => {
    expect(nextQuotaReset(new Date('2026-12-01T20:00:00Z')).toISOString()).toBe(
      '2026-12-02T08:00:00.000Z',
    );
  });

  it('counts from the Pacific date, not the UTC one', () => {
    // 02:00 UTC on Oct 8 is still Oct 7 in California.
    expect(nextQuotaReset(new Date('2026-10-08T02:00:00Z')).toISOString()).toBe(
      '2026-10-08T07:00:00.000Z',
    );
  });

  it('uses the offset of the next midnight when the clocks change before it', () => {
    // US summer time ends on Nov 1, 2026 at 02:00. At 01:00 (still UTC-7), the next
    // midnight is already in winter time (UTC-8).
    expect(nextQuotaReset(new Date('2026-11-01T08:00:00Z')).toISOString()).toBe(
      '2026-11-02T08:00:00.000Z',
    );
  });
});

describe('formatResetTime', () => {
  it('shows the hour in the given time zone', () => {
    expect(formatResetTime(new Date('2026-10-08T07:00:00Z'), 'Europe/Paris')).toBe('9 h');
    // Late October: Europe is back on winter time a week before the US.
    expect(formatResetTime(new Date('2026-10-26T07:00:00Z'), 'Europe/Paris')).toBe('8 h');
  });

  it('shows minutes when the offset is not a whole hour', () => {
    expect(formatResetTime(new Date('2026-10-08T07:00:00Z'), 'Asia/Kolkata')).toBe('12 h 30');
  });
});
