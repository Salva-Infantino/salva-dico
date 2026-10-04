import { identityForms } from './forms.ts';
import { LANGS, type Lang } from './languages.ts';
import { matchKeys } from './normalize.ts';
import type { Entry } from './schemas.ts';

export interface FindDuplicatesOptions {
  /** Entry being edited, which must not be reported as its own duplicate. */
  excludeId?: string;
}

/**
 * Entries that already contain `text` in `lang`, using the normalized comparison
 * (case, accents, articles and verb markers such as "to" / "se" are ignored).
 * Deleted entries are ignored.
 */
export function findDuplicates(
  entries: readonly Entry[],
  lang: Lang,
  text: string,
  options: FindDuplicatesOptions = {},
): Entry[] {
  const wanted = new Set(matchKeys(text, lang));
  if (wanted.size === 0) {
    return [];
  }
  return entries.filter(
    (entry) =>
      !entry.deleted &&
      entry.id !== options.excludeId &&
      identityForms(entry, lang).some((form) =>
        matchKeys(form, lang).some((key) => wanted.has(key)),
      ),
  );
}

/**
 * Precomputed version of `findDuplicates` for checks on every keystroke:
 * the normalized keys of every entry are computed once.
 */
export function createDuplicateFinder(entries: readonly Entry[]) {
  const byKey: Record<Lang, Map<string, Entry[]>> = {
    fr: new Map(),
    en: new Map(),
    es: new Map(),
    it: new Map(),
  };
  for (const entry of entries) {
    if (entry.deleted) continue;
    for (const lang of LANGS) {
      const keys = new Set(identityForms(entry, lang).flatMap((form) => matchKeys(form, lang)));
      for (const key of keys) {
        const list = byKey[lang].get(key);
        if (list) list.push(entry);
        else byKey[lang].set(key, [entry]);
      }
    }
  }

  return (lang: Lang, text: string, options: FindDuplicatesOptions = {}): Entry[] => {
    const found = new Map<string, Entry>();
    for (const key of matchKeys(text, lang)) {
      for (const entry of byKey[lang].get(key) ?? []) {
        if (entry.id !== options.excludeId) found.set(entry.id, entry);
      }
    }
    return [...found.values()];
  };
}
