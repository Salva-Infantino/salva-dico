import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  disableNetwork,
  doc,
  enableNetwork,
  setDoc,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEntry,
  entriesCollection,
  setMastered,
  softDeleteEntry,
} from '../../src/data/entriesRepository.ts';
import {
  cursorStorageKey,
  startEntriesSync,
  type CursorStorage,
} from '../../src/data/entriesSync.ts';
import { parseCursor } from '../../src/data/syncCursor.ts';
import type { Entry } from '../../src/domain/schemas.ts';
import { arbreContent, garconContent, grandContent } from '../../src/test/fixtures.ts';
import { createTestEnv, OWNER_UID, PROJECT_ID } from './testEnv.ts';

let env: RulesTestEnvironment;
const stops: (() => void)[] = [];

/** A fresh Firestore instance: a separate "device" with an empty local cache. */
function newDevice(): Firestore {
  return env.authenticatedContext(OWNER_UID).firestore() as unknown as Firestore;
}

function memoryStorage(): CursorStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

/** Starts a sync and resolves with the entries once `predicate` holds. */
function syncUntil(
  db: Firestore,
  storage: CursorStorage,
  predicate: (entries: ReadonlyMap<string, Entry>) => boolean,
): Promise<ReadonlyMap<string, Entry>> {
  return new Promise((resolve, reject) => {
    const stop = startEntriesSync({
      db,
      uid: OWNER_UID,
      storage,
      onEntries: (entries) => {
        if (predicate(entries)) resolve(new Map(entries));
      },
      onError: reject,
    });
    stops.push(stop);
  });
}

function storedCursor(storage: CursorStorage, device: Firestore) {
  return parseCursor(storage.getItem(cursorStorageKey(device.app.name, PROJECT_ID, OWNER_UID)));
}

beforeAll(async () => {
  env = await createTestEnv();
});

beforeEach(async () => {
  await env.clearFirestore();
});

afterEach(() => {
  stops.splice(0).forEach((stop) => {
    stop();
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe('entries sync (Firestore emulator)', () => {
  it('downloads every entry on a new device and stores the cursor', async () => {
    const writer = newDevice();
    const a = createEntry(writer, OWNER_UID, garconContent);
    const b = createEntry(writer, OWNER_UID, arbreContent);
    await Promise.all([a.committed, b.committed]);

    const storage = memoryStorage();
    const reader = newDevice();
    const entries = await syncUntil(reader, storage, (e) => e.size === 2);

    expect(entries.get(a.id)?.translations.fr[0]).toMatchObject({ text: 'garçon' });
    await vi.waitFor(() => {
      expect(storedCursor(storage, reader)).not.toBeNull();
    });
  });

  it('receives updates, soft deletes and new entries from another device', async () => {
    const device = newDevice();
    const storage = memoryStorage();
    const other = newDevice();
    const garcon = createEntry(other, OWNER_UID, garconContent);
    const arbre = createEntry(other, OWNER_UID, arbreContent);
    await Promise.all([garcon.committed, arbre.committed]);
    await syncUntil(device, storage, (e) => e.size === 2);

    await setMastered(other, OWNER_UID, garcon.id, true);
    await softDeleteEntry(other, OWNER_UID, arbre.id);
    const grand = createEntry(other, OWNER_UID, grandContent);
    await grand.committed;

    const entries = await syncUntil(
      device,
      storage,
      (e) =>
        e.get(garcon.id)?.mastered === true && e.get(arbre.id)?.deleted === true && e.has(grand.id),
    );
    expect(entries.size).toBe(3);
  });

  it('shows offline writes immediately and only advances the cursor once confirmed', async () => {
    const device = newDevice();
    const storage = memoryStorage();
    const first = createEntry(device, OWNER_UID, garconContent);
    await first.committed;
    await syncUntil(device, storage, (e) => e.size === 1);
    await vi.waitFor(() => {
      expect(storedCursor(storage, device)).not.toBeNull();
    });
    const confirmedCursor = storedCursor(storage, device);

    await disableNetwork(device);
    const offline = createEntry(device, OWNER_UID, arbreContent);
    await syncUntil(device, storage, (e) => e.has(offline.id));
    expect(storedCursor(storage, device)).toEqual(confirmedCursor);

    await enableNetwork(device);
    await offline.committed;
    await vi.waitFor(() => {
      const cursor = storedCursor(storage, device);
      expect(
        cursor && confirmedCursor && cursor.seconds * 1e9 + cursor.nanoseconds,
      ).toBeGreaterThan(
        confirmedCursor ? confirmedCursor.seconds * 1e9 + confirmedCursor.nanoseconds : 0,
      );
    });
  });

  it('does a full sync when the local cache was evicted, despite a stored cursor', async () => {
    const writer = newDevice();
    await createEntry(writer, OWNER_UID, garconContent).committed;

    const storage = memoryStorage();
    const device = newDevice();
    // A cursor far in the future would hide every entry if it were trusted.
    storage.setItem(cursorStorageKey(device.app.name, PROJECT_ID, OWNER_UID), '4102444800:0');
    const entries = await syncUntil(device, storage, (e) => e.size === 1);
    expect(entries.size).toBe(1);
  });

  it('skips invalid documents instead of failing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore() as unknown as Firestore;
      await setDoc(doc(entriesCollection(db, OWNER_UID), 'broken'), {
        type: 'noun',
        updatedAt: Timestamp.now(),
      });
    });
    const writer = newDevice();
    const valid = createEntry(writer, OWNER_UID, garconContent);
    await valid.committed;

    const entries = await syncUntil(newDevice(), memoryStorage(), (e) => e.has(valid.id));
    expect(entries.has('broken')).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});
