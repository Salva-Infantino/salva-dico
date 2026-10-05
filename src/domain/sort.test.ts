import { describe, expect, it } from 'vitest';
import {
  allerContent,
  arbreContent,
  garconContent,
  makeEntry,
  sVousPlaitContent,
} from '../test/fixtures.ts';
import { sortAlphabetically } from './sort.ts';

const expression = (fr: string) =>
  makeEntry(
    {
      type: 'word',
      translations: {
        fr: [{ text: fr }],
        en: [{ text: 'x' }],
        es: [{ text: 'x' }],
        it: [{ text: 'x' }],
      },
    },
    { id: fr },
  );

describe('sortAlphabetically', () => {
  it('sorts by the first French headword', () => {
    const sorted = sortAlphabetically([
      makeEntry(sVousPlaitContent, { id: 'svp' }),
      makeEntry(garconContent, { id: 'garcon' }),
      makeEntry(allerContent, { id: 'aller' }),
      makeEntry(arbreContent, { id: 'arbre' }),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(['aller', 'arbre', 'garcon', 'svp']);
  });

  it('ignores case and accents, and orders numbers naturally', () => {
    const sorted = sortAlphabetically([
      expression('été'),
      expression('Eau'),
      expression('mot 10'),
      expression('mot 2'),
      expression('étoile'),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(['Eau', 'été', 'étoile', 'mot 2', 'mot 10']);
  });

  it('can sort by another language', () => {
    const sorted = sortAlphabetically(
      [makeEntry(garconContent, { id: 'garcon' }), makeEntry(arbreContent, { id: 'arbre' })],
      'en',
    );
    expect(sorted.map((e) => e.id)).toEqual(['garcon', 'arbre']);
  });
});
