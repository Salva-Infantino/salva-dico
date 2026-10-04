import { describe, expect, it } from 'vitest';
import {
  allerContent,
  garconContent,
  grandContent,
  sourisContent,
  sVousPlaitContent,
} from '../test/fixtures.ts';
import { headwords, identityForms, searchableForms } from './forms.ts';

describe('headwords', () => {
  it('returns the noun without its article', () => {
    expect(headwords(garconContent, 'it')).toEqual(['ragazzo']);
  });

  it('returns the masculine singular for FR / ES / IT adjectives and the single form in EN', () => {
    expect(headwords(grandContent, 'fr')).toEqual(['grand']);
    expect(headwords(grandContent, 'en')).toEqual(['big']);
  });

  it('returns the infinitive of verbs', () => {
    expect(headwords(allerContent, 'es')).toEqual(['ir']);
  });

  it('returns one headword per translation', () => {
    expect(headwords(sVousPlaitContent, 'fr')).toEqual(["s'il vous plaît", "s'il te plaît"]);
  });
});

describe('identityForms', () => {
  it('includes every distinct adjective form', () => {
    expect(identityForms(grandContent, 'fr')).toEqual(['grand', 'grande', 'grands', 'grandes']);
    expect(identityForms(grandContent, 'it')).toEqual(['grande', 'grandi']);
  });

  it('does not include noun plurals', () => {
    expect(identityForms(sourisContent, 'en')).toEqual(['mouse']);
  });
});

describe('searchableForms', () => {
  it('adds noun plurals, including irregular English ones', () => {
    expect(searchableForms(sourisContent, 'en')).toEqual(['mouse', 'mice']);
    expect(searchableForms(garconContent, 'es')).toEqual(['chico', 'chicos']);
  });

  it('deduplicates identical singular and plural', () => {
    expect(searchableForms(sourisContent, 'fr')).toEqual(['souris']);
  });

  it('does not index conjugated forms', () => {
    expect(searchableForms(allerContent, 'fr')).toEqual(['aller']);
  });
});
