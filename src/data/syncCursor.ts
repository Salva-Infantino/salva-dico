/**
 * Position of the delta sync: the most recent server `updatedAt` already received.
 * Kept at full Timestamp precision (seconds + nanoseconds) so the `>` query never
 * re-downloads the last document because of millisecond rounding.
 */
export interface SyncCursor {
  seconds: number;
  nanoseconds: number;
}

export function compareCursors(a: SyncCursor, b: SyncCursor): number {
  return a.seconds - b.seconds || a.nanoseconds - b.nanoseconds;
}

export function maxCursor(a: SyncCursor | null, b: SyncCursor): SyncCursor {
  return a === null || compareCursors(b, a) > 0 ? b : a;
}

export function serializeCursor(cursor: SyncCursor): string {
  return `${String(cursor.seconds)}:${String(cursor.nanoseconds)}`;
}

/** Returns null for a missing or corrupted value, which triggers a full sync. */
export function parseCursor(value: string | null): SyncCursor | null {
  const match = value === null ? null : /^(\d+):(\d+)$/.exec(value);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const nanoseconds = Number(match[2]);
  return nanoseconds < 1e9 ? { seconds: Number(match[1]), nanoseconds } : null;
}

/**
 * The cursor to start from. An empty local cache with an existing cursor means the
 * cache was evicted (ex. Safari storage cleanup): the cursor is then dropped so
 * everything is downloaded again instead of silently missing entries.
 */
export function startingCursor(
  stored: SyncCursor | null,
  cachedDocCount: number,
): SyncCursor | null {
  return cachedDocCount === 0 ? null : stored;
}
