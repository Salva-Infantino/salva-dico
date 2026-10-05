import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type CollectionReference,
  type Firestore,
} from 'firebase/firestore';
import type { ExportedEntry } from '../domain/backup.ts';
import { entryContentSchema, type EntryContent } from '../domain/schemas.ts';
import { importedEntryDoc, newEntryDoc } from './entryDoc.ts';

/** Firestore limit of writes per batch. */
const MAX_BATCH_WRITES = 500;

/**
 * Write operations. Every write sets `updatedAt` to the server time so the delta
 * sync picks it up on other devices.
 *
 * The returned promises resolve when the server acknowledges the write. Offline,
 * Firestore applies the write to the local cache immediately and queues it, so
 * callers must not block the UI on these promises.
 */

export function entriesCollection(db: Firestore, uid: string): CollectionReference {
  return collection(db, 'users', uid, 'entries');
}

export function createEntry(
  db: Firestore,
  uid: string,
  content: EntryContent,
): { id: string; committed: Promise<void> } {
  const ref = doc(entriesCollection(db, uid));
  return { id: ref.id, committed: setDoc(ref, newEntryDoc(content)) };
}

export function updateEntryContent(
  db: Firestore,
  uid: string,
  id: string,
  content: EntryContent,
): Promise<void> {
  const { type, translations } = entryContentSchema.parse(content);
  return updateDoc(doc(entriesCollection(db, uid), id), {
    type,
    translations,
    updatedAt: serverTimestamp(),
  });
}

export function setMastered(
  db: Firestore,
  uid: string,
  id: string,
  mastered: boolean,
): Promise<void> {
  return updateDoc(doc(entriesCollection(db, uid), id), { mastered, updatedAt: serverTimestamp() });
}

/** Soft delete: the tombstone propagates to other devices through the delta sync. */
export function softDeleteEntry(db: Firestore, uid: string, id: string): Promise<void> {
  return updateDoc(doc(entriesCollection(db, uid), id), {
    deleted: true,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Writes imported entries under their own ids, in batches. Each batch is atomic.
 * Callers only import entries that are not in the dictionary (see `previewImport`):
 * a deleted entry with the same id is restored.
 */
export function importEntries(
  db: Firestore,
  uid: string,
  entries: readonly ExportedEntry[],
): Promise<void> {
  const commits: Promise<void>[] = [];
  for (let start = 0; start < entries.length; start += MAX_BATCH_WRITES) {
    const batch = writeBatch(db);
    for (const entry of entries.slice(start, start + MAX_BATCH_WRITES)) {
      batch.set(doc(entriesCollection(db, uid), entry.id), importedEntryDoc(entry));
    }
    commits.push(batch.commit());
  }
  return Promise.all(commits).then(() => undefined);
}
