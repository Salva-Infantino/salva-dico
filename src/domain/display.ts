/** Formatting helpers for display. Pure: no React, no UI strings. */

/** Joins an article and a word, without a space after an elided article (l'arbre, un'amica). */
export function withArticle(article: string, word: string): string {
  return article.endsWith("'") ? `${article}${word}` : `${article} ${word}`;
}

/** Distinct values, in their first-seen order. */
export function distinct(values: readonly string[]): string[] {
  return [...new Set(values)];
}

interface RomanceAdjective {
  mascSing: string;
  femSing: string;
  mascPlural: string;
  femPlural: string;
}

/**
 * The 4 adjective forms with duplicates removed: FR grand · grande · grands · grandes,
 * IT grande · grandi, ES feliz · felices.
 */
export function adjectiveForms(t: RomanceAdjective): string[] {
  return distinct([t.mascSing, t.femSing, t.mascPlural, t.femPlural]);
}
