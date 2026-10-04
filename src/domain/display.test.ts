import { describe, expect, it } from 'vitest';
import { adjectiveForms, distinct, withArticle } from './display.ts';

describe('withArticle', () => {
  it('adds a space after a full article', () => {
    expect(withArticle('le', 'garçon')).toBe('le garçon');
    expect(withArticle('gli', 'alberi')).toBe('gli alberi');
  });

  it('does not add a space after an elided article', () => {
    expect(withArticle("l'", 'arbre')).toBe("l'arbre");
    expect(withArticle("un'", 'amica')).toBe("un'amica");
  });
});

describe('distinct', () => {
  it('keeps the first occurrence order', () => {
    expect(distinct(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
  });
});

describe('adjectiveForms', () => {
  it('keeps 4 different forms', () => {
    expect(
      adjectiveForms({
        mascSing: 'grand',
        femSing: 'grande',
        mascPlural: 'grands',
        femPlural: 'grandes',
      }),
    ).toEqual(['grand', 'grande', 'grands', 'grandes']);
  });

  it('collapses identical forms', () => {
    expect(
      adjectiveForms({
        mascSing: 'grande',
        femSing: 'grande',
        mascPlural: 'grandi',
        femPlural: 'grandi',
      }),
    ).toEqual(['grande', 'grandi']);
    expect(
      adjectiveForms({
        mascSing: 'heureux',
        femSing: 'heureuse',
        mascPlural: 'heureux',
        femPlural: 'heureuses',
      }),
    ).toEqual(['heureux', 'heureuse', 'heureuses']);
  });
});
