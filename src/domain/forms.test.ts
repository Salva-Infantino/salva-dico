import { describe, expect, it } from 'vitest';
import { allerContent, garconContent, sVousPlaitContent } from '../test/fixtures.ts';
import { headwords } from './forms.ts';

describe('headwords', () => {
  it('returns the word of each language', () => {
    expect(headwords(garconContent, 'it')).toEqual(['ragazzo']);
  });

  it('returns the infinitive of verbs', () => {
    expect(headwords(allerContent, 'es')).toEqual(['ir']);
  });

  it('returns one headword per translation', () => {
    expect(headwords(sVousPlaitContent, 'fr')).toEqual(["s'il vous plaît", "s'il te plaît"]);
  });
});
