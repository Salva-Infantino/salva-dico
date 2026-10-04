import type { Lang } from './languages.ts';

/** Leading articles ignored by search and duplicate detection, per language. */
const ARTICLES: Record<Lang, { words: readonly string[]; elided: readonly string[] }> = {
  fr: { words: ['le', 'la', 'les', 'un', 'une', 'des'], elided: ["l'"] },
  en: { words: ['the', 'a', 'an'], elided: [] },
  es: { words: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'], elided: [] },
  it: { words: ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una'], elided: ["l'", "un'"] },
};

const LIGATURES: Record<string, string> = { œ: 'oe', æ: 'ae', ß: 'ss' };

/**
 * Case-, accent- and punctuation-insensitive form of a text.
 * Apostrophes are unified (’ → ') and kept, because they separate elided articles.
 */
export function foldText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[œæß]/g, (char) => LIGATURES[char] ?? char)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/[¿¡?!.,;:«»"“”()[\]…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Removes one leading article of `lang`, unless the article is the whole text. */
export function stripArticle(folded: string, lang: Lang): string {
  const { words, elided } = ARTICLES[lang];
  for (const article of elided) {
    if (folded.startsWith(article) && folded.length > article.length) {
      return folded.slice(article.length).trimStart();
    }
  }
  const [first, ...rest] = folded.split(' ');
  if (first !== undefined && rest.length > 0 && words.includes(first)) {
    return rest.join(' ');
  }
  return folded;
}

/** Normalized form used for comparisons: folded, without a leading article. */
export function normalize(text: string, lang: Lang): string {
  return stripArticle(foldText(text), lang);
}

/**
 * Bare infinitive of a normalized verb, so that "lever" matches "se lever",
 * "go" matches "to go", "levantar" matches "levantarse" and "alzare" matches "alzarsi".
 * Returns null when the text has no such marker.
 */
export function stripVerbMarker(normalized: string, lang: Lang): string | null {
  let bare: string;
  switch (lang) {
    case 'en':
      bare = normalized.replace(/^to /, '');
      break;
    case 'fr':
      bare = normalized.replace(/^(se |s')/, '');
      break;
    case 'es':
      bare = normalized.replace(/(?<=r)se$/, '');
      break;
    case 'it':
      bare = normalized.replace(/(?<=r)si$/, 'e');
      break;
  }
  return bare !== normalized && bare.length > 0 ? bare : null;
}

/** Every normalized key a text can be matched by (with and without verb markers). */
export function matchKeys(text: string, lang: Lang): string[] {
  const normalized = normalize(text, lang);
  if (normalized.length === 0) {
    return [];
  }
  const bare = stripVerbMarker(normalized, lang);
  return bare === null ? [normalized] : [normalized, bare];
}
