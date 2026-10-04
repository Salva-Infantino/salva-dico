import { describe, expect, it } from 'vitest';
import {
  compareCursors,
  maxCursor,
  parseCursor,
  serializeCursor,
  startingCursor,
} from './syncCursor.ts';

const a = { seconds: 100, nanoseconds: 500 };
const b = { seconds: 100, nanoseconds: 600 };
const c = { seconds: 101, nanoseconds: 0 };

describe('compareCursors / maxCursor', () => {
  it('orders by seconds, then nanoseconds', () => {
    expect(compareCursors(a, b)).toBeLessThan(0);
    expect(compareCursors(c, b)).toBeGreaterThan(0);
    expect(compareCursors(a, { ...a })).toBe(0);
  });

  it('keeps the most recent cursor', () => {
    expect(maxCursor(null, a)).toBe(a);
    expect(maxCursor(a, b)).toBe(b);
    expect(maxCursor(c, b)).toBe(c);
  });
});

describe('serializeCursor / parseCursor', () => {
  it('round-trips at full precision', () => {
    const cursor = { seconds: 1_759_000_000, nanoseconds: 123_456_789 };
    expect(parseCursor(serializeCursor(cursor))).toEqual(cursor);
  });

  it.each([null, '', 'abc', '12', '12:', '-1:0', '1.5:0', '1:1000000000'])(
    'returns null for %j',
    (value) => {
      expect(parseCursor(value)).toBeNull();
    },
  );
});

describe('startingCursor', () => {
  it('resumes from the stored cursor when the cache has entries', () => {
    expect(startingCursor(a, 42)).toBe(a);
  });

  it('starts a full sync on a new device', () => {
    expect(startingCursor(null, 0)).toBeNull();
  });

  it('starts a full sync when the cache was evicted', () => {
    expect(startingCursor(a, 0)).toBeNull();
  });
});
