import { foldText, matchKeys, stripArticle, stripVerbMarker } from './normalize.ts';
import { headwords } from './forms.ts';
import { LANGS, type EntryType, type Lang } from './languages.ts';
import type { Entry } from './schemas.ts';

export interface SearchIndexItem {
  entry: Entry;
  keys: Record<Lang, string[]>;
}

export interface SearchFilters {
  query: string;
  /** Languages to search in. Empty or omitted: all four. */
  langs?: readonly Lang[];
  /** Entry types to keep. Empty or omitted: all types. */
  types?: readonly EntryType[];
}

/**
 * Precomputes normalized keys once per entry so each keystroke only does string
 * comparisons. Deleted entries (tombstones) are excluded.
 */
export function buildSearchIndex(entries: readonly Entry[]): SearchIndexItem[] {
  return entries
    .filter((entry) => !entry.deleted)
    .map((entry) => ({
      entry,
      keys: {
        fr: keysFor(entry, 'fr'),
        en: keysFor(entry, 'en'),
        es: keysFor(entry, 'es'),
        it: keysFor(entry, 'it'),
      },
    }));
}

function keysFor(entry: Entry, lang: Lang): string[] {
  return [...new Set(headwords(entry, lang).flatMap((form) => matchKeys(form, lang)))];
}

/** Lower is better. */
const Rank = {
  Exact: 0,
  Prefix: 1,
  WordPrefix: 2,
  Substring: 3,
} as const;
type Rank = (typeof Rank)[keyof typeof Rank];

function rank(key: string, query: string): Rank | null {
  if (key === query) return Rank.Exact;
  if (key.startsWith(query)) return Rank.Prefix;
  if (key.includes(` ${query}`) || key.includes(`'${query}`) || key.includes(`-${query}`)) {
    return Rank.WordPrefix;
  }
  if (key.includes(query)) return Rank.Substring;
  return null;
}

/**
 * Filters entries and, when there is a query, sorts them by match quality
 * (exact, then prefix, then word prefix, then substring). Ties keep index order.
 * With an empty query, all entries matching the filters are returned in index order.
 */
export function searchEntries(index: readonly SearchIndexItem[], filters: SearchFilters): Entry[] {
  const langs = filters.langs && filters.langs.length > 0 ? filters.langs : LANGS;
  const types = filters.types && filters.types.length > 0 ? filters.types : null;
  const folded = foldText(filters.query);

  const candidates = types ? index.filter((item) => types.includes(item.entry.type)) : index;
  if (folded.length === 0) {
    return candidates.map((item) => item.entry);
  }

  // A query like "to go" or "se lever" also matches the bare infinitive.
  const queries = langs.flatMap((lang) => {
    const query = stripArticle(folded, lang);
    const bare = stripVerbMarker(query, lang);
    return bare === null
      ? [{ lang, query }]
      : [
          { lang, query },
          { lang, query: bare },
        ];
  });
  const ranked: { entry: Entry; rank: Rank }[] = [];
  for (const item of candidates) {
    let best: Rank | null = null;
    for (const { lang, query } of queries) {
      for (const key of item.keys[lang]) {
        const r = rank(key, query);
        if (r !== null && (best === null || r < best)) best = r;
      }
    }
    if (best !== null) ranked.push({ entry: item.entry, rank: best });
  }
  // Array.prototype.sort is stable, so equal ranks keep index order.
  return ranked.sort((a, b) => a.rank - b.rank).map((r) => r.entry);
}
