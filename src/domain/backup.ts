import { z } from 'zod';
import { entryContentSchema, type Entry, type EntryContent } from './schemas.ts';

/**
 * JSON export / import of the whole dictionary. The file carries its own version so
 * a future data model can still read old exports.
 */
export const EXPORT_APP = 'salva-dico';
export const EXPORT_VERSION = 1;
/** Larger files are refused before parsing (several thousand entries stay far below). */
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

const exportedEntryMeta = z.object({
  // Valid Firestore document id: no "/", not "." or "..", not reserved (__name__).
  id: z
    .string()
    .min(1)
    .max(200)
    .regex(/^(?!\.\.?$)(?!__.*__$)[^/]+$/, 'Not a valid document id'),
  mastered: z.boolean(),
  createdAt: z.number().int().nonnegative(),
});

/** An entry in an export: its content plus what identifies it and is worth keeping. */
export const exportedEntrySchema = z.intersection(exportedEntryMeta, entryContentSchema);
export type ExportedEntry = z.infer<typeof exportedEntryMeta> & EntryContent;

export interface ExportFile {
  app: typeof EXPORT_APP;
  exportVersion: number;
  exportedAt: string;
  entries: ExportedEntry[];
}

/** The live entries (tombstones excluded), oldest first. */
export function buildExport(entries: readonly Entry[], now: Date): ExportFile {
  return {
    app: EXPORT_APP,
    exportVersion: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    entries: entries
      .filter((entry) => !entry.deleted)
      .sort((a, b) => a.createdAt - b.createdAt)
      // Sync metadata is rebuilt on import.
      .map(
        ({ schemaVersion: _version, updatedAt: _updatedAt, deleted: _deleted, ...exported }) =>
          exported,
      ),
  };
}

/** `salva-dico-2026-10-05.json`, in local time. */
export function exportFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${EXPORT_APP}-${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

const exportEnvelopeSchema = z.object({
  app: z.literal(EXPORT_APP),
  exportVersion: z.number().int().positive(),
  entries: z.array(z.unknown()),
});

export type ImportError = 'not_json' | 'not_an_export' | 'newer_version';

export interface ImportPreview {
  /** Entries to write: not in the dictionary yet. */
  toImport: ExportedEntry[];
  /** Entries already in the dictionary (same id), or repeated in the file: ignored. */
  alreadyPresent: number;
  /** Entries that do not match the data model: ignored. */
  invalid: number;
}

/**
 * Reads an export and compares it with the dictionary. Nothing is ever overwritten:
 * an entry whose id already exists is ignored, so importing the same file twice adds
 * nothing. A deleted entry (tombstone) does not count as present: importing restores it.
 */
export function previewImport(
  text: string,
  existing: readonly Entry[],
  now: number = Date.now(),
): { ok: true; preview: ImportPreview } | { ok: false; error: ImportError } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not_json' };
  }
  const envelope = exportEnvelopeSchema.safeParse(json);
  if (!envelope.success) return { ok: false, error: 'not_an_export' };
  if (envelope.data.exportVersion > EXPORT_VERSION) return { ok: false, error: 'newer_version' };

  const present = new Set(existing.filter((entry) => !entry.deleted).map((entry) => entry.id));
  const preview: ImportPreview = { toImport: [], alreadyPresent: 0, invalid: 0 };
  for (const raw of envelope.data.entries) {
    const entry = exportedEntrySchema.safeParse(raw);
    // The rules refuse a creation date in the future.
    if (!entry.success || entry.data.createdAt > now) {
      preview.invalid += 1;
    } else if (present.has(entry.data.id)) {
      preview.alreadyPresent += 1;
    } else {
      present.add(entry.data.id);
      preview.toImport.push(entry.data);
    }
  }
  return { ok: true, preview };
}
