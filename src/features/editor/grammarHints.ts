import type { RomanceLang } from '../../domain/languages.ts';

/**
 * Input helpers for the entry form. They only pre-fill or suggest: every value
 * stays editable, and irregular words are corrected by hand.
 */

export type Gender = 'm' | 'f';

/** Singular articles offered per language, with the gender they imply (null: ambiguous). */
export const SINGULAR_ARTICLES: Record<
  RomanceLang,
  readonly { article: string; gender: Gender | null }[]
> = {
  fr: [
    { article: 'le', gender: 'm' },
    { article: 'la', gender: 'f' },
    { article: "l'", gender: null },
  ],
  // "el" is masculine except before a stressed a- (el agua, f.): the gender stays editable.
  es: [
    { article: 'el', gender: 'm' },
    { article: 'la', gender: 'f' },
  ],
  it: [
    { article: 'il', gender: 'm' },
    { article: 'lo', gender: 'm' },
    { article: 'la', gender: 'f' },
    { article: "l'", gender: null },
  ],
};

export const PLURAL_ARTICLES: Record<RomanceLang, readonly string[]> = {
  fr: ['les'],
  es: ['los', 'las'],
  it: ['i', 'gli', 'le'],
};

/** Gender implied by a singular article, or null when it does not tell (l'). */
export function genderFromArticle(lang: RomanceLang, article: string): Gender | null {
  return SINGULAR_ARTICLES[lang].find((option) => option.article === article)?.gender ?? null;
}

/** Usual plural article: les; los / las; i / gli / le (il → i, lo and l' (m.) → gli). */
export function suggestPluralArticle(
  lang: RomanceLang,
  gender: Gender | null,
  article: string,
): string | null {
  switch (lang) {
    case 'fr':
      return 'les';
    case 'es':
      return gender === null ? null : gender === 'm' ? 'los' : 'las';
    case 'it':
      if (gender === 'f') return 'le';
      if (gender === null) return null;
      return article === 'lo' || article === "l'" ? 'gli' : 'i';
  }
}

export interface AdjectiveForms {
  femSing: string;
  mascPlural: string;
  femPlural: string;
}

/**
 * Regular forms derived from the masculine singular. Covers the common patterns
 * (FR petit, ES pequeño / feliz, IT piccolo / grande); irregular ones (FR beau,
 * heureux) are corrected by hand.
 */
export function suggestAdjectiveForms(lang: RomanceLang, mascSing: string): AdjectiveForms | null {
  const word = mascSing.trim();
  if (word === '') return null;
  const stem = word.slice(0, -1);
  switch (lang) {
    case 'fr': {
      const femSing = word.endsWith('e') ? word : `${word}e`;
      const mascPlural = /[sx]$/.test(word) ? word : `${word}s`;
      return { femSing, mascPlural, femPlural: `${femSing}s` };
    }
    case 'es':
      if (word.endsWith('o')) {
        return { femSing: `${stem}a`, mascPlural: `${word}s`, femPlural: `${stem}as` };
      }
      if (/[aeiouáéíóú]$/.test(word)) {
        return { femSing: word, mascPlural: `${word}s`, femPlural: `${word}s` };
      }
      // feliz → felices: final z becomes c before -es.
      return {
        femSing: word,
        mascPlural: word.endsWith('z') ? `${stem}ces` : `${word}es`,
        femPlural: word.endsWith('z') ? `${stem}ces` : `${word}es`,
      };
    case 'it':
      if (word.endsWith('o')) {
        return { femSing: `${stem}a`, mascPlural: `${stem}i`, femPlural: `${stem}e` };
      }
      if (word.endsWith('e')) {
        return { femSing: word, mascPlural: `${stem}i`, femPlural: `${stem}i` };
      }
      return { femSing: word, mascPlural: word, femPlural: word };
  }
}

interface NounHintFields {
  article: string;
  gender: '' | Gender;
  pluralArticle: string;
}

/**
 * Applies the noun hints after an edit: an article that implies a gender sets it,
 * and the plural article follows the article and gender, unless it was changed by
 * hand (it then differs from what was suggested before the edit).
 */
export function withNounHints<T extends NounHintFields>(
  lang: RomanceLang,
  previous: T,
  next: T,
): T {
  const result = { ...next };
  if (next.article !== previous.article) {
    const implied = genderFromArticle(lang, next.article);
    if (implied) result.gender = implied;
  }
  const before = suggestPluralArticle(lang, previous.gender || null, previous.article) ?? '';
  if (next.pluralArticle === '' || next.pluralArticle === before) {
    result.pluralArticle = suggestPluralArticle(lang, result.gender || null, result.article) ?? '';
  }
  return result;
}

interface AdjectiveHintFields extends AdjectiveForms {
  /** Masculine singular. */
  text: string;
}

/**
 * Keeps the 3 other adjective forms in step with the masculine singular while they
 * are empty or still equal to the previous suggestion; a form edited by hand is kept.
 */
export function withAdjectiveHints<T extends AdjectiveHintFields>(
  lang: RomanceLang,
  previous: T,
  next: T,
): T {
  if (next.text === previous.text) return next;
  const before = suggestAdjectiveForms(lang, previous.text);
  const after = suggestAdjectiveForms(lang, next.text);
  const result = { ...next };
  for (const field of ['femSing', 'mascPlural', 'femPlural'] as const) {
    if (next[field] === '' || next[field] === before?.[field]) {
      result[field] = after?.[field] ?? '';
    }
  }
  return result;
}
