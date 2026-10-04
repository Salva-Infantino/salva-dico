import { describe, expect, it } from 'vitest';
import { conjugationEsSchema, conjugationFrSchema, conjugationItSchema } from './schemas.ts';
import { IMPERATIVE, TENSES, withPronoun } from './conjugation.ts';

describe('TENSES', () => {
  it.each([
    ['fr', conjugationFrSchema],
    ['es', conjugationEsSchema],
    ['it', conjugationItSchema],
  ] as const)('[%s] lists every tense of the schema exactly once', (lang, schema) => {
    const keys = [...TENSES[lang].map((tense) => tense.key), IMPERATIVE[lang].key, 'auxiliary'];
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.filter((key) => key !== 'auxiliary' || lang !== 'es').sort()).toEqual(
      Object.keys(schema.shape).sort(),
    );
  });
});

describe('withPronoun', () => {
  it.each([
    ['fr', 0, 'vais', 'je ', 'vais'],
    ['fr', 0, 'allais', "j'", 'allais'],
    ['fr', 0, 'habite', "j'", 'habite'],
    ['fr', 0, 'ai parlé', "j'", 'ai parlé'],
    ['fr', 0, 'me lève', 'je ', 'me lève'],
    ['fr', 2, 'va', 'il/elle ', 'va'],
    ['es', 0, 'voy', 'yo ', 'voy'],
    ['it', 5, 'vanno', 'loro ', 'vanno'],
  ] as const)('[%s] person %i %j → %j + %j', (lang, person, form, pronoun, shown) => {
    expect(withPronoun(lang, person, form)).toEqual({ pronoun, form: shown });
  });
});
