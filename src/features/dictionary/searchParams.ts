import { ENTRY_TYPES, isLang, type EntryType, type Lang } from '../../domain/languages.ts';

export interface DictionaryFilters {
  query: string;
  /** Language shown first in each row, and used for the alphabetical order. */
  lang: Lang;
  /** Only words or only verbs; `null` shows both. */
  type: EntryType | null;
  /** Entry previewed next to the list (wide screens only). */
  selected: string | null;
}

export const DEFAULT_LANG: Lang = 'fr';

const isEntryType = (value: string | null): value is EntryType =>
  (ENTRY_TYPES as readonly (string | null)[]).includes(value);

/**
 * Filters live in the URL (?q=…&lang=it&type=word): going back from an entry
 * restores the search, and a search can be bookmarked. Unknown values are ignored.
 */
export function parseFilters(params: URLSearchParams): DictionaryFilters {
  const lang = params.get('lang');
  const type = params.get('type');
  const selected = params.get('entry');
  return {
    query: params.get('q') ?? '',
    lang: isLang(lang) ? lang : DEFAULT_LANG,
    type: isEntryType(type) ? type : null,
    selected: selected === '' ? null : selected,
  };
}

export function filtersToParams(filters: DictionaryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.lang !== DEFAULT_LANG) params.set('lang', filters.lang);
  if (filters.type) params.set('type', filters.type);
  if (filters.selected) params.set('entry', filters.selected);
  return params;
}

/** Adds the value if absent, removes it if present. */
export function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
