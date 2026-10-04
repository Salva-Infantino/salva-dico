import { ENTRY_TYPES, LANGS, type EntryType, type Lang } from '../../domain/languages.ts';

export interface DictionaryFilters {
  query: string;
  langs: Lang[];
  types: EntryType[];
}

const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value);
const isEntryType = (value: string): value is EntryType =>
  (ENTRY_TYPES as readonly string[]).includes(value);

function list<T extends string>(value: string | null, guard: (v: string) => v is T): T[] {
  return [...new Set((value ?? '').split(',').filter(guard))];
}

/**
 * Filters live in the URL (?q=…&langs=it,es&types=noun): going back from an entry
 * restores the search, and a search can be bookmarked. Unknown values are ignored.
 */
export function parseFilters(params: URLSearchParams): DictionaryFilters {
  return {
    query: params.get('q') ?? '',
    langs: list(params.get('langs'), isLang),
    types: list(params.get('types'), isEntryType),
  };
}

export function filtersToParams(filters: DictionaryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  // Keep the canonical order so equal filters give equal URLs.
  const langs = LANGS.filter((lang) => filters.langs.includes(lang));
  const types = ENTRY_TYPES.filter((type) => filters.types.includes(type));
  if (langs.length > 0) params.set('langs', langs.join(','));
  if (types.length > 0) params.set('types', types.join(','));
  return params;
}

/** Adds the value if absent, removes it if present. */
export function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
