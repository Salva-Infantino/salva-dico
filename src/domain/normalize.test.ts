import { describe, expect, it } from 'vitest';
import { foldText, matchKeys, normalize, stripArticle, stripVerbMarker } from './normalize.ts';

describe('foldText', () => {
  it.each([
    ['Été', 'ete'],
    ['Español', 'espanol'],
    ['ÀÉÎÕÜ', 'aeiou'],
    ['perché', 'perche'],
    ['cœur', 'coeur'],
    ['  a   lot  ', 'a lot'],
    ['¿Qué tal?', 'que tal'],
    ['¡Hola!', 'hola'],
    ['l’arbre', "l'arbre"],
    ['peut-être', 'peut-etre'],
  ])('folds %j to %j', (input, expected) => {
    expect(foldText(input)).toBe(expected);
  });
});

describe('stripArticle', () => {
  it.each([
    ['fr', 'le garcon', 'garcon'],
    ['fr', 'les arbres', 'arbres'],
    ['fr', "l'arbre", 'arbre'],
    ['fr', 'une maison', 'maison'],
    ['en', 'the house', 'house'],
    ['en', 'an apple', 'apple'],
    ['es', 'los ninos', 'ninos'],
    ['es', 'unas casas', 'casas'],
    ['it', 'il ragazzo', 'ragazzo'],
    ['it', 'gli alberi', 'alberi'],
    ['it', 'lo zio', 'zio'],
    ['it', "un'amica", 'amica'],
    ['it', "l'albero", 'albero'],
  ] as const)('[%s] strips the article of %j', (lang, input, expected) => {
    expect(stripArticle(input, lang)).toBe(expected);
  });

  it('only strips the articles of the given language', () => {
    expect(stripArticle('il ragazzo', 'fr')).toBe('il ragazzo');
    expect(stripArticle('the house', 'es')).toBe('the house');
  });

  it('keeps a text that is only an article', () => {
    expect(stripArticle('la', 'fr')).toBe('la');
    expect(stripArticle("l'", 'fr')).toBe("l'");
  });

  it('only strips a leading article, once', () => {
    expect(stripArticle('la la land', 'en')).toBe('la la land');
    expect(stripArticle('le le', 'fr')).toBe('le');
  });

  it('does not strip a word that merely starts like an article', () => {
    expect(stripArticle('lampe', 'fr')).toBe('lampe');
    expect(stripArticle('island', 'it')).toBe('island');
  });
});

describe('normalize', () => {
  it('combines folding and article stripping', () => {
    expect(normalize('L’Arbre', 'fr')).toBe('arbre');
    expect(normalize('El Árbol', 'es')).toBe('arbol');
    expect(normalize('  Il   RAGAZZO ', 'it')).toBe('ragazzo');
  });
});

describe('stripVerbMarker', () => {
  it.each([
    ['en', 'to go', 'go'],
    ['fr', 'se lever', 'lever'],
    ['fr', "s'asseoir", 'asseoir'],
    ['es', 'levantarse', 'levantar'],
    ['es', 'irse', 'ir'],
    ['it', 'alzarsi', 'alzare'],
    ['it', 'divertirsi', 'divertire'],
  ] as const)('[%s] %j -> %j', (lang, input, expected) => {
    expect(stripVerbMarker(input, lang)).toBe(expected);
  });

  it.each([
    ['en', 'go'],
    ['en', 'tomato'],
    ['fr', 'lever'],
    ['fr', 'semer'],
    ['es', 'base'],
    ['it', 'andare'],
    ['it', 'forse'],
  ] as const)('[%s] returns null for %j', (lang, input) => {
    expect(stripVerbMarker(input, lang)).toBeNull();
  });
});

describe('matchKeys', () => {
  it('returns the normalized text and its bare verb form', () => {
    expect(matchKeys('Se Lever', 'fr')).toEqual(['se lever', 'lever']);
    expect(matchKeys('to Go', 'en')).toEqual(['to go', 'go']);
  });

  it('returns a single key when there is no verb marker', () => {
    expect(matchKeys('La Maison', 'fr')).toEqual(['maison']);
  });

  it('returns no key for blank text', () => {
    expect(matchKeys('  ', 'fr')).toEqual([]);
    expect(matchKeys('¿?', 'es')).toEqual([]);
  });
});
