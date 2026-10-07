import { describe, expect, it } from 'vitest';
import { capitalize, distinct } from './display.ts';

describe('distinct', () => {
  it('keeps the first occurrence order', () => {
    expect(distinct(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
  });
});

describe('capitalize', () => {
  it('capitalizes the first letter, after any leading punctuation', () => {
    expect(capitalize('arbre')).toBe('Arbre');
    expect(capitalize("s'il vous plaît")).toBe("S'il vous plaît");
    expect(capitalize('¿qué tal?')).toBe('¿Qué tal?');
    expect(capitalize('être')).toBe('Être');
  });

  it('leaves the rest of the text and already capitalized words alone', () => {
    expect(capitalize('get up')).toBe('Get up');
    expect(capitalize('Paris')).toBe('Paris');
    expect(capitalize('')).toBe('');
  });
});
