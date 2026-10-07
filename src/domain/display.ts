/** Formatting helpers for display. Pure: no React, no UI strings. */

/** Distinct values, in their first-seen order. */
export function distinct(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/**
 * Words are shown with a capital first letter ("S'il vous plaît", "¿Qué tal?"); they are
 * stored as typed, so search, duplicates and exports do not depend on it.
 */
export function capitalize(text: string): string {
  return text.replace(/\p{L}/u, (letter) => letter.toUpperCase());
}
