/** Formatting helpers for display. Pure: no React, no UI strings. */

/** Distinct values, in their first-seen order. */
export function distinct(values: readonly string[]): string[] {
  return [...new Set(values)];
}
