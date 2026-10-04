import { identityForms } from './forms.ts';
import type { Lang } from './languages.ts';
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
