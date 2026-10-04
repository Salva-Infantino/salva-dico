import { Timestamp } from 'firebase/firestore';
import { describe, expect, it, vi } from 'vitest';
import { allerContent, garconContent } from '../test/fixtures.ts';
import { entryFromDoc, newEntryDoc } from './entryDoc.ts';

describe('newEntryDoc', () => {
  it('adds the metadata of a new entry, with server timestamps', () => {
    const data = newEntryDoc(garconContent);
    expect(data).toMatchObject({
      ...garconContent,
      schemaVersion: 1,
      mastered: false,
      deleted: false,
    });
    expect(data.createdAt).toBeDefined();
    expect(data.updatedAt).toBeDefined();
    expect(data).not.toHaveProperty('id');
  });

  it('refuses invalid content', () => {
    const invalid = { ...garconContent, translations: { ...garconContent.translations, it: [] } };
    expect(() => newEntryDoc(invalid)).toThrow();
  });
});

describe('entryFromDoc', () => {
  const stored = {
    ...allerContent,
    schemaVersion: 1,
    mastered: true,
    deleted: false,
    createdAt: Timestamp.fromMillis(1_000),
    updatedAt: new Timestamp(2, 500_000_000),
  };

  it('converts a document to an entry with millisecond timestamps', () => {
    expect(entryFromDoc('abc', stored)).toEqual({
      ...allerContent,
      id: 'abc',
      schemaVersion: 1,
      mastered: true,
      deleted: false,
      createdAt: 1_000,
      updatedAt: 2_500,
    });
  });

  it('returns null and warns for an invalid document', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(entryFromDoc('bad', { ...stored, type: 'adverb' })).toBeNull();
    expect(entryFromDoc('no-time', { ...stored, updatedAt: null })).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
