import { describe, expect, it } from 'vitest';
import { filtersToParams, parseFilters, toggle } from './searchParams.ts';

describe('parseFilters', () => {
  it('reads the query, languages and types', () => {
    expect(parseFilters(new URLSearchParams('q=ragazzo&langs=it,es&types=noun'))).toEqual({
      query: 'ragazzo',
      langs: ['it', 'es'],
      types: ['noun'],
    });
  });

  it('defaults to an empty search', () => {
    expect(parseFilters(new URLSearchParams())).toEqual({ query: '', langs: [], types: [] });
  });

  it('ignores unknown and duplicated values', () => {
    expect(parseFilters(new URLSearchParams('langs=it,de,it,&types=adverb,verb'))).toEqual({
      query: '',
      langs: ['it'],
      types: ['verb'],
    });
  });
});

describe('filtersToParams', () => {
  it('omits empty filters', () => {
    expect(filtersToParams({ query: '', langs: [], types: [] }).toString()).toBe('');
  });

  it('writes values in canonical order', () => {
    const params = filtersToParams({
      query: 'l’arbre',
      langs: ['it', 'fr'],
      types: ['verb', 'noun'],
    });
    expect(params.get('q')).toBe('l’arbre');
    expect(params.get('langs')).toBe('fr,it');
    expect(params.get('types')).toBe('noun,verb');
  });

  it('round-trips through parseFilters', () => {
    const filters = { query: 'se lever', langs: ['fr' as const], types: ['verb' as const] };
    expect(parseFilters(filtersToParams(filters))).toEqual(filters);
  });
});

describe('toggle', () => {
  it('adds a missing value and removes a present one', () => {
    expect(toggle(['fr'], 'it')).toEqual(['fr', 'it']);
    expect(toggle(['fr', 'it'], 'fr')).toEqual(['it']);
  });
});
