import { describe, expect, it } from 'vitest';
import {
  genderFromArticle,
  suggestAdjectiveForms,
  suggestPluralArticle,
  withAdjectiveHints,
  withNounHints,
} from './grammarHints.ts';

describe('genderFromArticle', () => {
  it.each([
    ['fr', 'le', 'm'],
    ['fr', 'la', 'f'],
    ['fr', "l'", null],
    ['es', 'el', 'm'],
    ['es', 'la', 'f'],
    ['it', 'lo', 'm'],
    ['it', "l'", null],
    ['it', 'xx', null],
  ] as const)('[%s] %s -> %s', (lang, article, gender) => {
    expect(genderFromArticle(lang, article)).toBe(gender);
  });
});

describe('suggestPluralArticle', () => {
  it.each([
    ['fr', 'm', "l'", 'les'],
    ['fr', null, "l'", 'les'],
    ['es', 'm', 'el', 'los'],
    ['es', 'f', 'el', 'las'], // el agua -> las aguas
    ['es', null, 'el', null],
    ['it', 'm', 'il', 'i'],
    ['it', 'm', 'lo', 'gli'],
    ['it', 'm', "l'", 'gli'],
    ['it', 'f', "l'", 'le'],
    ['it', 'f', 'la', 'le'],
    ['it', null, "l'", null],
  ] as const)('[%s] %s %s -> %s', (lang, gender, article, expected) => {
    expect(suggestPluralArticle(lang, gender, article)).toBe(expected);
  });
});

describe('suggestAdjectiveForms', () => {
  it.each([
    ['fr', 'petit', ['petite', 'petits', 'petites']],
    ['fr', 'rouge', ['rouge', 'rouges', 'rouges']],
    ['fr', 'gris', ['grise', 'gris', 'grises']],
    ['es', 'pequeño', ['pequeña', 'pequeños', 'pequeñas']],
    ['es', 'grande', ['grande', 'grandes', 'grandes']],
    ['es', 'feliz', ['feliz', 'felices', 'felices']],
    ['es', 'azul', ['azul', 'azules', 'azules']],
    ['it', 'piccolo', ['piccola', 'piccoli', 'piccole']],
    ['it', 'grande', ['grande', 'grandi', 'grandi']],
    ['it', 'blu', ['blu', 'blu', 'blu']],
  ] as const)('[%s] %s', (lang, word, [femSing, mascPlural, femPlural]) => {
    expect(suggestAdjectiveForms(lang, word)).toEqual({ femSing, mascPlural, femPlural });
  });

  it('returns null for an empty word', () => {
    expect(suggestAdjectiveForms('fr', '  ')).toBeNull();
  });
});

describe('withNounHints', () => {
  interface Fields {
    article: string;
    gender: '' | 'm' | 'f';
    pluralArticle: string;
  }
  const blank: Fields = { article: '', gender: '', pluralArticle: '' };

  it('derives the gender and plural article from the article', () => {
    expect(withNounHints('it', blank, { ...blank, article: 'lo' })).toEqual({
      article: 'lo',
      gender: 'm',
      pluralArticle: 'gli',
    });
  });

  it("asks for the gender with an ambiguous article, then suggests the plural (l' f. → le)", () => {
    const elided = withNounHints('it', blank, { ...blank, article: "l'" });
    expect(elided).toEqual({ article: "l'", gender: '', pluralArticle: '' });
    expect(withNounHints('it', elided, { ...elided, gender: 'f' }).pluralArticle).toBe('le');
  });

  it('updates a suggested plural article when the gender changes (el agua → las)', () => {
    const el = withNounHints('es', blank, { ...blank, article: 'el' });
    expect(el.pluralArticle).toBe('los');
    expect(withNounHints('es', el, { ...el, gender: 'f' })).toEqual({
      article: 'el',
      gender: 'f',
      pluralArticle: 'las',
    });
  });

  it('keeps a plural article chosen by hand', () => {
    const edited: Fields = { article: 'il', gender: 'm', pluralArticle: 'gli' };
    expect(withNounHints('it', edited, { ...edited, article: 'la' })).toEqual({
      article: 'la',
      gender: 'f',
      pluralArticle: 'gli',
    });
  });
});

describe('withAdjectiveHints', () => {
  const blank = { text: '', femSing: '', mascPlural: '', femPlural: '' };

  it('fills the other forms as the masculine singular is typed', () => {
    const piccol = withAdjectiveHints('it', blank, { ...blank, text: 'piccol' });
    const piccolo = withAdjectiveHints('it', piccol, { ...piccol, text: 'piccolo' });
    expect(piccolo).toEqual({
      text: 'piccolo',
      femSing: 'piccola',
      mascPlural: 'piccoli',
      femPlural: 'piccole',
    });
  });

  it('keeps forms corrected by hand', () => {
    const beau = { text: 'beau', femSing: 'belle', mascPlural: 'beaux', femPlural: 'belles' };
    expect(withAdjectiveHints('fr', beau, { ...beau, text: 'beaux' })).toMatchObject({
      femSing: 'belle',
      mascPlural: 'beaux',
      femPlural: 'belles',
    });
  });
});
