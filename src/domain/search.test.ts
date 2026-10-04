import { describe, expect, it } from 'vitest';
import {
  allerContent,
  arbreContent,
  garconContent,
  grandContent,
  makeEntry,
  seLeverContent,
  sourisContent,
  sVousPlaitContent,
} from '../test/fixtures.ts';
import type { Entry } from './schemas.ts';
import { buildSearchIndex, searchEntries, type SearchFilters } from './search.ts';

const entries: Entry[] = [
  makeEntry(garconContent, { id: 'garcon' }),
  makeEntry(arbreContent, { id: 'arbre' }),
  makeEntry(sourisContent, { id: 'souris' }),
  makeEntry(grandContent, { id: 'grand' }),
  makeEntry(sVousPlaitContent, { id: 'svp' }),
  makeEntry(allerContent, { id: 'aller' }),
  makeEntry(seLeverContent, { id: 'se-lever' }),
  makeEntry(garconContent, { id: 'deleted', deleted: true }),
];
const index = buildSearchIndex(entries);

function ids(filters: SearchFilters): string[] {
  return searchEntries(index, filters).map((entry) => entry.id);
}

describe('buildSearchIndex', () => {
  it('excludes deleted entries', () => {
    expect(index.map((item) => item.entry.id)).not.toContain('deleted');
    expect(index).toHaveLength(entries.length - 1);
  });
});

describe('searchEntries', () => {
  it('returns every entry in index order for an empty query', () => {
    expect(ids({ query: '  ' })).toEqual(index.map((item) => item.entry.id));
  });

  it('searches the 4 languages at once', () => {
    expect(ids({ query: 'garcon' })).toEqual(['garcon']);
    expect(ids({ query: 'boy' })).toEqual(['garcon']);
    expect(ids({ query: 'chico' })).toEqual(['garcon']);
    expect(ids({ query: 'ragazzo' })).toEqual(['garcon']);
  });

  it('is case- and accent-insensitive in both directions', () => {
    expect(ids({ query: 'ARBOL' })).toEqual(['arbre']);
    expect(ids({ query: 'Garçon' })).toEqual(['garcon']);
    expect(ids({ query: 'plait' })).toEqual(['svp']);
  });

  it('ignores articles in the query', () => {
    expect(ids({ query: 'il ragazzo' })).toEqual(['garcon']);
    expect(ids({ query: "l'albero" })).toEqual(['arbre']);
    expect(ids({ query: 'the tree' })).toEqual(['arbre']);
  });

  it('matches plurals and adjective forms', () => {
    expect(ids({ query: 'mice' })).toEqual(['souris']);
    expect(ids({ query: 'grandi' })).toEqual(['grand']);
  });

  it('matches reflexive verbs and English infinitives without their marker', () => {
    expect(ids({ query: 'lever' })).toEqual(['se-lever']);
    expect(ids({ query: 'levantar' })).toEqual(['se-lever']);
    expect(ids({ query: 'alzare' })).toEqual(['se-lever']);
    expect(ids({ query: 'to go' })).toEqual(['aller']);
    expect(ids({ query: 'se lever' })).toEqual(['se-lever']);
  });

  it('ranks exact matches, then prefixes, then word prefixes, then substrings', () => {
    const ranked = buildSearchIndex([
      makeEntry({ type: 'expression', translations: expr('xabc') }, { id: 'substring' }),
      makeEntry({ type: 'expression', translations: expr('x abc') }, { id: 'word-prefix' }),
      makeEntry({ type: 'expression', translations: expr('abc') }, { id: 'prefix' }),
      makeEntry({ type: 'expression', translations: expr('ab') }, { id: 'exact' }),
    ]);
    const result = searchEntries(ranked, { query: 'ab', langs: ['fr'] }).map((e) => e.id);
    expect(result).toEqual(['exact', 'prefix', 'word-prefix', 'substring']);
  });

  it('only searches the selected languages', () => {
    expect(ids({ query: 'grande', langs: ['en'] })).toEqual([]);
    expect(ids({ query: 'grande', langs: ['fr', 'it'] })).toEqual(['grand']);
  });

  it('filters by entry type, with or without a query', () => {
    expect(ids({ query: '', types: ['verb'] })).toEqual(['aller', 'se-lever']);
    expect(ids({ query: 'gr', types: ['noun'] })).toEqual([]);
    expect(ids({ query: 'gr', types: ['adjective'] })).toEqual(['grand']);
  });

  it('treats empty filter lists as "all"', () => {
    expect(ids({ query: 'boy', langs: [], types: [] })).toEqual(['garcon']);
  });
});

function expr(fr: string) {
  return {
    fr: [{ text: fr }],
    en: [{ text: 'x' }],
    es: [{ text: 'x' }],
    it: [{ text: 'x' }],
  };
}
