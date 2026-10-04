import { describe, expect, it } from 'vitest';
import {
  allerContent,
  arbreContent,
  garconContent,
  grandContent,
  makeEntry,
  seLeverContent,
} from '../test/fixtures.ts';
import { findDuplicates } from './duplicates.ts';
import type { Entry } from './schemas.ts';

const entries: Entry[] = [
  makeEntry(garconContent, { id: 'garcon' }),
  makeEntry(arbreContent, { id: 'arbre' }),
  makeEntry(grandContent, { id: 'grand' }),
  makeEntry(allerContent, { id: 'aller' }),
  makeEntry(seLeverContent, { id: 'se-lever' }),
];

function ids(...args: Parameters<typeof findDuplicates> extends [unknown, ...infer R] ? R : never) {
  return findDuplicates(entries, ...args).map((entry) => entry.id);
}

describe('findDuplicates', () => {
  it('finds an existing word with a normalized comparison', () => {
    expect(ids('fr', 'GARÇON')).toEqual(['garcon']);
    expect(ids('es', 'el árbol')).toEqual(['arbre']);
    expect(ids('it', "L'albero")).toEqual(['arbre']);
  });

  it('only compares within the given language', () => {
    expect(ids('fr', 'ragazzo')).toEqual([]);
    expect(ids('it', 'ragazzo')).toEqual(['garcon']);
  });

  it('requires a whole-word match, not a prefix', () => {
    expect(ids('fr', 'garço')).toEqual([]);
    expect(ids('fr', 'garçonnet')).toEqual([]);
  });

  it('matches any adjective form', () => {
    expect(ids('fr', 'grandes')).toEqual(['grand']);
  });

  it('ignores verb markers', () => {
    expect(ids('en', 'to go')).toEqual(['aller']);
    expect(ids('fr', 'lever')).toEqual(['se-lever']);
    expect(ids('es', 'levantarse')).toEqual(['se-lever']);
  });

  it('excludes the entry being edited', () => {
    expect(ids('fr', 'garçon', { excludeId: 'garcon' })).toEqual([]);
  });

  it('ignores deleted entries', () => {
    const deleted = makeEntry(garconContent, { id: 'garcon', deleted: true });
    expect(findDuplicates([deleted], 'fr', 'garçon')).toEqual([]);
  });

  it('returns nothing for blank text', () => {
    expect(ids('fr', '   ')).toEqual([]);
  });
});
