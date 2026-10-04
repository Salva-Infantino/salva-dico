import type { Lang } from './languages.ts';
import type { EntryContent } from './schemas.ts';

/**
 * Main written form of each translation of an entry in one language
 * (the noun without its article, the infinitive, the masculine singular adjective).
 */
export function headwords(entry: EntryContent, lang: Lang): string[] {
  switch (entry.type) {
    case 'adjective':
      return entry.translations[lang].map((t) => ('text' in t ? t.text : t.mascSing));
    case 'expression':
    case 'noun':
    case 'verb':
      return entry.translations[lang].map((t) => t.text);
  }
}

/**
 * Forms that identify the same word: headwords plus every adjective form
 * (typing "grande" should find the adjective stored as "grand").
 */
export function identityForms(entry: EntryContent, lang: Lang): string[] {
  if (entry.type === 'adjective') {
    return unique(
      entry.translations[lang].flatMap((t) =>
        'text' in t ? [t.text] : [t.mascSing, t.femSing, t.mascPlural, t.femPlural],
      ),
    );
  }
  return headwords(entry, lang);
}

/** Every form the search should match: identity forms plus noun plurals. */
export function searchableForms(entry: EntryContent, lang: Lang): string[] {
  if (entry.type === 'noun') {
    return unique(
      entry.translations[lang].flatMap((t) =>
        t.plural === undefined ? [t.text] : [t.text, t.plural],
      ),
    );
  }
  return identityForms(entry, lang);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
