import { describe, expect, it } from 'vitest';
import { allerContent, arbreContent, garconContent, makeEntry } from '../test/fixtures.ts';
import { buildExport, exportFileName, previewImport, type ImportPreview } from './backup.ts';
import type { Entry } from './schemas.ts';

const NOW = new Date(2026, 9, 5, 14, 30);

const entries: Entry[] = [
  makeEntry(allerContent, { id: 'aller', createdAt: 20, mastered: true }),
  makeEntry(garconContent, { id: 'garcon', createdAt: 10, updatedAt: 99 }),
  makeEntry(arbreContent, { id: 'gone', createdAt: 5, deleted: true }),
];

function preview(text: string, existing: Entry[] = []): ImportPreview {
  const result = previewImport(text, existing);
  if (!result.ok) throw new Error(result.error);
  return result.preview;
}

describe('buildExport', () => {
  it('exports live entries, oldest first, without sync metadata', () => {
    const file = buildExport(entries, NOW);
    expect(file).toMatchObject({ app: 'salva-dico', exportVersion: 1 });
    expect(file.exportedAt).toBe(NOW.toISOString());
    expect(file.entries.map((entry) => entry.id)).toEqual(['garcon', 'aller']);
    expect(file.entries[0]).toEqual({
      id: 'garcon',
      mastered: false,
      createdAt: 10,
      ...garconContent,
    });
    expect(file.entries[0]).not.toHaveProperty('updatedAt');
  });

  it('names the file after the local date', () => {
    expect(exportFileName(NOW)).toBe('salva-dico-2026-10-05.json');
  });
});

describe('previewImport', () => {
  const exported = JSON.stringify(buildExport(entries, NOW));

  it('round-trips an export into an empty dictionary', () => {
    expect(preview(exported)).toEqual({
      toImport: buildExport(entries, NOW).entries,
      alreadyPresent: 0,
      invalid: 0,
    });
  });

  it('ignores entries already present, so importing twice adds nothing', () => {
    expect(preview(exported, entries)).toMatchObject({ toImport: [], alreadyPresent: 2 });
  });

  it('restores an entry that was deleted since the export', () => {
    const file = JSON.stringify(buildExport([makeEntry(arbreContent, { id: 'gone' })], NOW));
    expect(preview(file, entries).toImport.map((entry) => entry.id)).toEqual(['gone']);
  });

  it('counts invalid entries and repeated ids without failing the whole file', () => {
    const file = buildExport(entries, NOW);
    const text = JSON.stringify({
      ...file,
      entries: [
        ...file.entries,
        file.entries[0],
        {
          ...file.entries[0],
          id: 'no-es',
          translations: { ...garconContent.translations, es: [] },
        },
        { ...file.entries[0], id: 'a/b' },
        { ...file.entries[0], id: '__name__' },
        { ...file.entries[0], id: 'future', createdAt: Date.now() + 86_400_000 },
        'not an entry',
      ],
    });
    expect(preview(text)).toMatchObject({ alreadyPresent: 1, invalid: 5 });
    expect(preview(text).toImport).toHaveLength(2);
  });

  it('rejects files that are not exports', () => {
    expect(previewImport('{oops', [])).toEqual({ ok: false, error: 'not_json' });
    expect(previewImport('{"entries":[]}', [])).toEqual({ ok: false, error: 'not_an_export' });
    expect(previewImport('[]', [])).toEqual({ ok: false, error: 'not_an_export' });
  });

  it('rejects exports from a newer version of the app', () => {
    const text = JSON.stringify({ app: 'salva-dico', exportVersion: 2, entries: [] });
    expect(previewImport(text, [])).toEqual({ ok: false, error: 'newer_version' });
  });
});
