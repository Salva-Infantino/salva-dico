import {
  getDocsFromCache,
  onSnapshot,
  query,
  Timestamp,
  where,
  type Firestore,
  type QuerySnapshot,
} from 'firebase/firestore';
import type { Entry } from '../domain/schemas.ts';
import { entriesCollection } from './entriesRepository.ts';
import { entryFromDoc } from './entryDoc.ts';
import {
  maxCursor,
  parseCursor,
  serializeCursor,
  startingCursor,
  type SyncCursor,
} from './syncCursor.ts';

/** Minimal storage interface (localStorage in the app, a Map in tests). */
export interface CursorStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface EntriesSyncOptions {
  db: Firestore;
  uid: string;
  storage: CursorStorage;
  /** Called with every entry known locally (tombstones included) after each change. */
  onEntries: (entries: ReadonlyMap<string, Entry>) => void;
  onError?: (error: Error) => void;
}

/**
 * Per app, project and user: the real project and the emulators share an origin
 * (localhost), and each emulator run has its own app name (see ClientEnv.appName).
 */
export function cursorStorageKey(appName: string, projectId: string, uid: string): string {
  return `salva-dico:sync-cursor:${appName}:${projectId}:${uid}`;
}

/**
 * Cost-aware delta sync:
 * 1. load every entry from the persistent local cache (free, works offline);
 * 2. listen only to documents whose server `updatedAt` is after the stored cursor.
 * An app start with no remote change costs a single billed read instead of one per entry.
 *
 * Returns a function that stops the sync.
 */
export function startEntriesSync(options: EntriesSyncOptions): () => void {
  const { db, uid, storage, onEntries, onError } = options;
  const entries = new Map<string, Entry>();
  const key = cursorStorageKey(db.app.name, db.app.options.projectId ?? '', uid);
  let unsubscribe: (() => void) | null = null;
  const stopped = new AbortController();

  const applySnapshot = (snapshot: QuerySnapshot) => {
    for (const change of snapshot.docChanges()) {
      // With an `updatedAt >` query, documents never leave the result set
      // (hard deletes are forbidden by the rules), so 'removed' is ignored.
      if (change.type === 'removed') continue;
      const entry = entryFromDoc(change.doc.id, change.doc.data({ serverTimestamps: 'estimate' }));
      if (entry) entries.set(entry.id, entry);
    }
  };

  void (async () => {
    const collectionRef = entriesCollection(db, uid);
    let cachedCount = 0;
    try {
      const cached = await getDocsFromCache(collectionRef);
      cachedCount = cached.size;
      applySnapshot(cached);
    } catch {
      // Nothing cached yet (first launch on this device): full sync below.
    }
    if (stopped.signal.aborted) return;
    onEntries(entries);

    let cursor = startingCursor(parseCursor(storage.getItem(key)), cachedCount);
    const deltaQuery =
      cursor === null
        ? collectionRef
        : query(
            collectionRef,
            where('updatedAt', '>', new Timestamp(cursor.seconds, cursor.nanoseconds)),
          );

    unsubscribe = onSnapshot(
      deltaQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        applySnapshot(snapshot);
        cursor = advanceCursor(cursor, snapshot);
        if (cursor !== null) storage.setItem(key, serializeCursor(cursor));
        onEntries(entries);
      },
      (error) => onError?.(error),
    );
  })();

  return () => {
    stopped.abort();
    unsubscribe?.();
  };
}

/** Only server-confirmed timestamps move the cursor: never cached data or local estimates. */
function advanceCursor(cursor: SyncCursor | null, snapshot: QuerySnapshot): SyncCursor | null {
  if (snapshot.metadata.fromCache) return cursor;
  let next = cursor;
  for (const doc of snapshot.docs) {
    if (doc.metadata.hasPendingWrites) continue;
    const updatedAt: unknown = doc.get('updatedAt');
    if (updatedAt instanceof Timestamp) next = maxCursor(next, updatedAt);
  }
  return next;
}
