import { describe, expect, it } from 'vitest';
import { filtersToParams, parseFilters, toggle } from './searchParams.ts';

describe('parseFilters', () => {
  it('reads the query, display language, type and selected entry', () => {
    expect(parseFilters(new URLSearchParams('q=ragazzo&lang=it&type=word&entry=e1'))).toEqual({
      query: 'ragazzo',
      lang: 'it',
      type: 'word',
      selected: 'e1',
    });
  });

  it('defaults to an empty search displayed in French', () => {
    expect(parseFilters(new URLSearchParams())).toEqual({
      query: '',
      lang: 'fr',
      type: null,
      selected: null,
    });
  });

  it('ignores unknown values', () => {
    expect(parseFilters(new URLSearchParams('lang=de&type=adverb'))).toEqual({
      query: '',
      lang: 'fr',
      type: null,
      selected: null,
    });
  });
});

describe('filtersToParams', () => {
  it('omits default values', () => {
    expect(filtersToParams({ query: '', lang: 'fr', type: null, selected: null }).toString()).toBe(
      '',
    );
  });

  it('round-trips through parseFilters', () => {
    const filters = {
      query: 'se lever',
      lang: 'es' as const,
      type: 'verb' as const,
      selected: 'x',
    };
    expect(parseFilters(filtersToParams(filters))).toEqual(filters);
  });
});

describe('toggle', () => {
  it('adds a missing value and removes a present one', () => {
    expect(toggle(['fr'], 'it')).toEqual(['fr', 'it']);
    expect(toggle(['fr', 'it'], 'fr')).toEqual(['it']);
  });
});
