import { serverTimestamp, Timestamp, type DocumentData, type FieldValue } from 'firebase/firestore';
import type { ExportedEntry } from '../domain/backup.ts';
import {
  CURRENT_SCHEMA_VERSION,
  entryContentSchema,
  entrySchema,
  type Entry,
  type EntryContent,
} from '../domain/schemas.ts';

/**
 * Boundary between Firestore documents and domain entries.
 * In Firestore, the id is the document id and timestamps are `Timestamp`s;
 * in the domain, the id is a field and timestamps are epoch milliseconds.
 */

export type NewEntryDoc = EntryContent & {
  schemaVersion: number;
  mastered: boolean;
  deleted: boolean;
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue;
};

export function newEntryDoc(content: EntryContent): NewEntryDoc {
  return {
    ...entryContentSchema.parse(content),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    mastered: false,
    deleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/** Document of an imported entry: it keeps its mastered state and its creation date. */
export function importedEntryDoc({ mastered, createdAt, ...content }: ExportedEntry): NewEntryDoc {
  return {
    ...newEntryDoc(content),
    mastered,
    createdAt: Timestamp.fromMillis(createdAt),
  };
}

/**
 * Converts a document to an entry, or returns null (with a warning) when it does
 * not match the schema, so one bad document never breaks the whole dictionary.
 * Read pending server timestamps with `serverTimestamps: 'estimate'` before calling this.
 */
export function entryFromDoc(id: string, data: DocumentData): Entry | null {
  const result = entrySchema.safeParse({
    ...data,
    id,
    createdAt: toMillis(data['createdAt']),
    updatedAt: toMillis(data['updatedAt']),
  });
  if (!result.success) {
    console.warn(`Ignoring invalid entry document "${id}"`, result.error.issues);
    return null;
  }
  return result.data;
}

function toMillis(value: unknown): unknown {
  return value instanceof Timestamp ? value.toMillis() : value;
}
