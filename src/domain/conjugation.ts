import { PERSON_LABELS, type RomanceLang } from './languages.ts';
import type { ConjugationES, ConjugationFR, ConjugationIT } from './schemas.ts';

/** French reference tense, used to show a French equivalent next to native tense names. */
export type FrenchTense =
  | 'present'
  | 'passeCompose'
  | 'passeSimple'
  | 'imparfait'
  | 'futurSimple'
  | 'conditionnel'
  | 'imperatif';

type SixPersonKey<C> = { [K in keyof C]: C[K] extends readonly string[] ? K : never }[keyof C];

export interface TenseInfo<K extends string = string> {
  key: K;
  /** Name in the language itself (Pretérito indefinido, Passato prossimo). */
  name: string;
  /** French equivalent, shown discreetly. */
  french: FrenchTense;
}

/**
 * Tenses of each language, in display order (section 5 of CLAUDE.md).
 * The keys are the fields of the conjugation schemas.
 */
export const TENSES = {
  fr: [
    { key: 'present', name: 'Présent', french: 'present' },
    { key: 'passeCompose', name: 'Passé composé', french: 'passeCompose' },
    { key: 'imparfait', name: 'Imparfait', french: 'imparfait' },
    { key: 'futurSimple', name: 'Futur simple', french: 'futurSimple' },
    { key: 'conditionnelPresent', name: 'Conditionnel présent', french: 'conditionnel' },
  ],
  es: [
    { key: 'presente', name: 'Presente', french: 'present' },
    { key: 'preteritoPerfecto', name: 'Pretérito perfecto', french: 'passeCompose' },
    { key: 'preteritoIndefinido', name: 'Pretérito indefinido', french: 'passeSimple' },
    { key: 'preteritoImperfecto', name: 'Pretérito imperfecto', french: 'imparfait' },
    { key: 'futuroSimple', name: 'Futuro simple', french: 'futurSimple' },
    { key: 'condicional', name: 'Condicional', french: 'conditionnel' },
  ],
  it: [
    { key: 'presente', name: 'Presente', french: 'present' },
    { key: 'passatoProssimo', name: 'Passato prossimo', french: 'passeCompose' },
    { key: 'imperfetto', name: 'Imperfetto', french: 'imparfait' },
    { key: 'futuroSemplice', name: 'Futuro semplice', french: 'futurSimple' },
    { key: 'condizionalePresente', name: 'Condizionale presente', french: 'conditionnel' },
  ],
} as const satisfies {
  fr: readonly TenseInfo<SixPersonKey<ConjugationFR>>[];
  es: readonly TenseInfo<SixPersonKey<ConjugationES>>[];
  it: readonly TenseInfo<SixPersonKey<ConjugationIT>>[];
};

export const IMPERATIVE = {
  fr: { key: 'imperatifPresent', name: 'Impératif présent', french: 'imperatif' },
  es: { key: 'imperativo', name: 'Imperativo', french: 'imperatif' },
  it: { key: 'imperativo', name: 'Imperativo', french: 'imperatif' },
} as const satisfies Record<RomanceLang, TenseInfo>;

/** Imperative persons: 2sg, 1pl, 2pl. */
export const IMPERATIVE_LABELS: Record<RomanceLang, readonly [string, string, string]> = {
  fr: ['tu', 'nous', 'vous'],
  es: ['tú', 'nosotros', 'vosotros'],
  it: ['tu', 'noi', 'voi'],
};

/** Languages with an auxiliary choice for compound tenses. */
export const AUXILIARIES = {
  fr: ['avoir', 'être'],
  it: ['avere', 'essere'],
} as const;

/** Starts with a vowel or a mute h: French "je" elides (j'allais, j'habite). */
const ELIDES = /^[aeiouyhàâäéèêëîïôöùûü]/i;

/**
 * Subject pronoun and form, as displayed: "je vais", "j'allais", "je me lève".
 * Returns the pronoun and the form separately so the pronoun can be styled discreetly.
 */
export function withPronoun(
  lang: RomanceLang,
  person: number,
  form: string,
): { pronoun: string; form: string } {
  const label = PERSON_LABELS[lang][person] ?? '';
  if (lang === 'fr' && person === 0 && ELIDES.test(form)) {
    return { pronoun: "j'", form };
  }
  return { pronoun: `${label} `, form };
}
