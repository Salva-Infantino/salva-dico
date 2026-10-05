import type { Lang } from './languages.ts';
import type { EntryContent } from './schemas.ts';

/** Written form of each translation of an entry in one language (the word, the infinitive). */
export function headwords(entry: EntryContent, lang: Lang): string[] {
  return entry.translations[lang].map((t) => t.text);
}
