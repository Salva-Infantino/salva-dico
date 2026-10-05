export const LANGS = ['fr', 'en', 'es', 'it'] as const;
export type Lang = (typeof LANGS)[number];

/** Languages with full verb conjugations (6 persons, imperative). */
export const ROMANCE_LANGS = ['fr', 'es', 'it'] as const satisfies readonly Lang[];
export type RomanceLang = (typeof ROMANCE_LANGS)[number];

/** A word (or an expression) needs only its text; a verb also has its conjugation. */
export const ENTRY_TYPES = ['word', 'verb'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export type SixPersons<T> = readonly [T, T, T, T, T, T];

/**
 * Subject pronouns used as row labels in conjugation tables (display only, never stored).
 * Order: 1sg, 2sg, 3sg, 1pl, 2pl, 3pl.
 */
export const PERSON_LABELS: Record<RomanceLang, SixPersons<string>> = {
  fr: ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles'],
  es: ['yo', 'tú', 'él/ella', 'nosotros', 'vosotros', 'ellos/ellas'],
  it: ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'],
};
