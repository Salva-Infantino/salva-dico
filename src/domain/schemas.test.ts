import { describe, expect, it } from 'vitest';
import {
  ALL_CONTENTS,
  allerContent,
  garconContent,
  grandContent,
  makeEntry,
} from '../test/fixtures.ts';
import { entryContentSchema, entrySchema } from './schemas.ts';

/** Deep, mutable copy of a fixture, to build invalid variants. */
function clone<T>(value: T): T {
  return structuredClone(value);
}

describe('entrySchema', () => {
  it.each(ALL_CONTENTS.map((content) => [content.type, content] as const))(
    'accepts a valid %s entry',
    (_type, content) => {
      expect(entrySchema.safeParse(makeEntry(content)).success).toBe(true);
    },
  );

  it('requires every language', () => {
    const entry = clone(makeEntry(garconContent));
    const { fr, en, es } = entry.translations;
    expect(entrySchema.safeParse({ ...entry, translations: { fr, en, es } }).success).toBe(false);
  });

  it('requires at least one translation per language', () => {
    const entry = clone(makeEntry(garconContent));
    const translations = { ...entry.translations, es: [] };
    expect(entrySchema.safeParse({ ...entry, translations }).success).toBe(false);
  });

  it('rejects empty and whitespace-only words', () => {
    const entry = clone(makeEntry(garconContent));
    const translations = { ...entry.translations, en: [{ text: '   ' }] };
    expect(entrySchema.safeParse({ ...entry, translations }).success).toBe(false);
  });

  it('trims words', () => {
    const entry = clone(makeEntry(garconContent));
    const translations = { ...entry.translations, en: [{ text: '  boy ' }] };
    const parsed = entrySchema.parse({ ...entry, translations });
    expect(parsed.translations.en[0]?.text).toBe('boy');
  });

  it('accepts several translations of equal weight in one language', () => {
    const entry = clone(makeEntry(grandContent));
    const translations = { ...entry.translations, en: [{ text: 'big' }, { text: 'tall' }] };
    expect(entrySchema.safeParse({ ...entry, translations }).success).toBe(true);
  });

  it('drops grammar fields from words (no gender, article or plural)', () => {
    const entry = clone(makeEntry(garconContent));
    const translations = {
      ...entry.translations,
      fr: [{ text: 'garçon', gender: 'm', article: 'le' }],
    };
    const parsed = entrySchema.parse({ ...entry, translations });
    expect(parsed.translations.fr[0]).toEqual({ text: 'garçon' });
  });

  it('requires exactly 6 persons per tense', () => {
    const entry = clone(makeEntry(allerContent));
    const [fr] = entry.translations.fr;
    const translations = {
      ...entry.translations,
      fr: [{ ...fr, conjugation: { ...fr.conjugation, present: ['vais', 'vas', 'va'] } }],
    };
    expect(entrySchema.safeParse({ ...entry, translations }).success).toBe(false);
  });

  it('requires 3 persons in each imperative form', () => {
    const entry = clone(makeEntry(allerContent));
    const [es] = entry.translations.es;
    const imperativo = { affirmative: ['ve', 'vamos', 'id'], negative: ['no vayas'] };
    const translations = {
      ...entry.translations,
      es: [{ ...es, conjugation: { ...es.conjugation, imperativo } }],
    };
    expect(entrySchema.safeParse({ ...entry, translations }).success).toBe(false);
  });

  it('only accepts the auxiliaries of each language', () => {
    const entry = clone(makeEntry(allerContent));
    const [it] = entry.translations.it;
    const translations = {
      ...entry.translations,
      it: [{ ...it, conjugation: { ...it.conjugation, auxiliary: 'être' } }],
    };
    expect(entrySchema.safeParse({ ...entry, translations }).success).toBe(false);
  });

  it('rejects translations that do not match the entry type', () => {
    const entry = { ...makeEntry(garconContent), type: 'verb' };
    expect(entrySchema.safeParse(entry).success).toBe(false);
  });

  it('rejects an unknown schema version', () => {
    expect(entrySchema.safeParse({ ...makeEntry(garconContent), schemaVersion: 2 }).success).toBe(
      false,
    );
  });

  it('rejects non-integer or negative timestamps', () => {
    expect(entrySchema.safeParse({ ...makeEntry(garconContent), updatedAt: -1 }).success).toBe(
      false,
    );
    expect(entrySchema.safeParse({ ...makeEntry(garconContent), createdAt: 1.5 }).success).toBe(
      false,
    );
  });
});

describe('entryContentSchema', () => {
  it('accepts content without stored metadata (form, AI output)', () => {
    expect(entryContentSchema.safeParse(allerContent).success).toBe(true);
  });

  it('rejects an unknown entry type', () => {
    expect(entryContentSchema.safeParse({ ...garconContent, type: 'adverb' }).success).toBe(false);
  });
});
