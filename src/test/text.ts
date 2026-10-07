/**
 * Testing Library turns non-breaking spaces of the page into plain spaces before matching
 * (default whitespace normalization), but not those of the expected text. Expected French
 * messages (see i18n/typography.ts) go through this to match.
 */
export function plain(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, ' ');
}
