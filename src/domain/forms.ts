import { capitalize } from './display.ts';
import type { Lang } from './languages.ts';
import type { EntryContent } from './schemas.ts';

/** Written form of each translation of an entry in one language (the word, the infinitive). */
export function headwords(entry: EntryContent, lang: Lang): string[] {
  return entry.translations[lang].map((t) => t.text);
}

/** The headwords as displayed: each with a capital first letter. */
export function displayedHeadwords(entry: EntryContent, lang: Lang): string[] {
  return headwords(entry, lang).map(capitalize);
}
