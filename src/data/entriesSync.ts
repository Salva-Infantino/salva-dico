import {
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
 * Cost-aware delta sync, with two listeners:
 * 1. a cache-only listener on the whole collection (free, works offline) is the single
 *    source of the entries: it sees local writes at once, including offline ones whose
 *    server `updatedAt` is still pending, and everything the server listener brings in;
 * 2. a server listener only on documents whose server `updatedAt` is after the stored
 *    cursor, which feeds the local cache. An app start with no remote change costs a
 *    single billed read instead of one per entry.
 *
 * The server listener alone would not do: a pending server timestamp does not match
 * `updatedAt > cursor` locally, so offline writes would stay invisible until reconnection.
 *
 * Returns a function that stops the sync.
 */
export function startEntriesSync(options: EntriesSyncOptions): () => void {
  const { db, uid, storage, onEntries, onError } = options;
  const entries = new Map<string, Entry>();
  const key = cursorStorageKey(db.app.name, db.app.options.projectId ?? '', uid);
  const collectionRef = entriesCollection(db, uid);
  let unsubscribeServer: (() => void) | null = null;

  const applySnapshot = (snapshot: QuerySnapshot) => {
    for (const change of snapshot.docChanges()) {
      // Hard deletes are forbidden by the rules: documents never leave the collection.
      if (change.type === 'removed') continue;
      const entry = entryFromDoc(change.doc.id, change.doc.data({ serverTimestamps: 'estimate' }));
      if (entry) entries.set(entry.id, entry);
    }
  };

  const startServerListener = (cachedCount: number) => {
    let cursor = startingCursor(parseCursor(storage.getItem(key)), cachedCount);
    const deltaQuery =
      cursor === null
        ? collectionRef
        : query(
            collectionRef,
            where('updatedAt', '>', new Timestamp(cursor.seconds, cursor.nanoseconds)),
          );
    unsubscribeServer = onSnapshot(
      deltaQuery,
      // Metadata changes: a server acknowledgement must advance the cursor.
      { includeMetadataChanges: true },
      (snapshot) => {
        cursor = advanceCursor(cursor, snapshot);
        if (cursor !== null) storage.setItem(key, serializeCursor(cursor));
      },
      (error) => onError?.(error),
    );
  };

  const unsubscribeCache = onSnapshot(
    collectionRef,
    { source: 'cache' },
    (snapshot) => {
      applySnapshot(snapshot);
      // The first cache snapshot holds everything cached on this device.
      if (!unsubscribeServer) startServerListener(snapshot.size);
      onEntries(entries);
    },
    (error) => onError?.(error),
  );

  return () => {
    unsubscribeCache();
    unsubscribeServer?.();
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
