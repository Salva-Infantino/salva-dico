import { headwords } from './forms.ts';
import type { Lang } from './languages.ts';
import type { Entry } from './schemas.ts';

const collators = new Map<Lang, Intl.Collator>();

function collator(lang: Lang): Intl.Collator {
  let result = collators.get(lang);
  if (!result) {
    // Case- and accent-insensitive at the first level, numeric for "mot 2" < "mot 10".
    result = new Intl.Collator(lang, { sensitivity: 'base', numeric: true });
    collators.set(lang, result);
  }
  return result;
}

/** Alphabetical order by the first headword in `lang` (French by default), stable on ties. */
export function sortAlphabetically(entries: readonly Entry[], lang: Lang = 'fr'): Entry[] {
  const { compare } = collator(lang);
  return entries
    .map((entry) => ({ entry, key: headwords(entry, lang)[0] ?? '' }))
    .sort((a, b) => compare(a.key, b.key))
    .map(({ entry }) => entry);
}
