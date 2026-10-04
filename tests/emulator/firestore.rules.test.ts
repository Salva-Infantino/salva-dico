import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { newEntryDoc } from '../../src/data/entryDoc.ts';
import { entriesCollection } from '../../src/data/entriesRepository.ts';
import { garconContent } from '../../src/test/fixtures.ts';
import { createTestEnv, OWNER_UID } from './testEnv.ts';

const OTHER_UID = 'someone-else';
const ENTRY_ID = 'entry-1';

let env: RulesTestEnvironment;

function ownerDb(): Firestore {
  return env.authenticatedContext(OWNER_UID).firestore() as unknown as Firestore;
}

function entryRef(db: Firestore, uid = OWNER_UID, id = ENTRY_ID) {
  return doc(entriesCollection(db, uid), id);
}

/** Seeds an existing entry, bypassing the rules. */
async function seedEntry(uid = OWNER_UID, data: DocumentData = {}) {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    await setDoc(entryRef(db, uid), {
      ...garconContent,
      schemaVersion: 1,
      mastered: false,
      deleted: false,
      createdAt: Timestamp.fromMillis(1_000),
      updatedAt: Timestamp.fromMillis(1_000),
      ...data,
    });
  });
}

beforeAll(async () => {
  env = await createTestEnv();
});

beforeEach(async () => {
  await env.clearFirestore();
});

afterAll(async () => {
  await env.cleanup();
});

describe('reads', () => {
  it('allows the owner to read their entries', async () => {
    await seedEntry();
    await assertSucceeds(getDoc(entryRef(ownerDb())));
    await assertSucceeds(getDocs(entriesCollection(ownerDb(), OWNER_UID)));
  });

  it('denies unauthenticated users', async () => {
    await seedEntry();
    const db = env.unauthenticatedContext().firestore() as unknown as Firestore;
    await assertFails(getDoc(entryRef(db)));
  });

  it("denies another user reading the owner's entries", async () => {
    await seedEntry();
    const db = env.authenticatedContext(OTHER_UID).firestore() as unknown as Firestore;
    await assertFails(getDoc(entryRef(db)));
  });

  it('denies another user using their own path (nobody else can use the app)', async () => {
    const db = env.authenticatedContext(OTHER_UID).firestore() as unknown as Firestore;
    await assertFails(getDocs(entriesCollection(db, OTHER_UID)));
    await assertFails(setDoc(entryRef(db, OTHER_UID), newEntryDoc(garconContent)));
  });

  it('denies everything outside users/{uid}/entries', async () => {
    const db = ownerDb();
    await assertFails(getDoc(doc(db, 'users', OWNER_UID)));
    await assertFails(setDoc(doc(db, 'config', 'x'), { a: 1 }));
  });
});

describe('create', () => {
  it('allows the owner to create a valid entry', async () => {
    await assertSucceeds(setDoc(entryRef(ownerDb()), newEntryDoc(garconContent)));
  });

  it('denies a client-side updatedAt', async () => {
    const data = { ...newEntryDoc(garconContent), updatedAt: Timestamp.now() };
    await assertFails(setDoc(entryRef(ownerDb()), data));
  });

  it('allows an older createdAt (import) but not one in the future', async () => {
    const db = ownerDb();
    const imported = { ...newEntryDoc(garconContent), createdAt: Timestamp.fromMillis(1_000) };
    await assertSucceeds(setDoc(entryRef(db), imported));
    const future = {
      ...newEntryDoc(garconContent),
      createdAt: Timestamp.fromMillis(Date.now() + 3_600_000),
    };
    await assertFails(setDoc(entryRef(db, OWNER_UID, 'entry-2'), future));
  });

  it('denies unknown or missing fields', async () => {
    const db = ownerDb();
    await assertFails(setDoc(entryRef(db), { ...newEntryDoc(garconContent), extra: true }));
    const { mastered, ...withoutMastered } = newEntryDoc(garconContent);
    await assertFails(setDoc(entryRef(db), withoutMastered));
  });

  it('denies an unknown type or a missing language', async () => {
    const db = ownerDb();
    await assertFails(setDoc(entryRef(db), { ...newEntryDoc(garconContent), type: 'adverb' }));
    const { it: italian, ...threeLanguages } = garconContent.translations;
    await assertFails(
      setDoc(entryRef(db), { ...newEntryDoc(garconContent), translations: threeLanguages }),
    );
    await assertFails(
      setDoc(entryRef(db), {
        ...newEntryDoc(garconContent),
        translations: { ...garconContent.translations, es: [] },
      }),
    );
  });

  it('denies wrong field types', async () => {
    const db = ownerDb();
    await assertFails(setDoc(entryRef(db), { ...newEntryDoc(garconContent), deleted: 'no' }));
    await assertFails(setDoc(entryRef(db), { ...newEntryDoc(garconContent), schemaVersion: '1' }));
  });
});

describe('update', () => {
  beforeEach(async () => {
    await seedEntry();
  });

  it('allows a soft delete and a mastered toggle with a server timestamp', async () => {
    const db = ownerDb();
    await assertSucceeds(updateDoc(entryRef(db), { mastered: true, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(entryRef(db), { deleted: true, updatedAt: serverTimestamp() }));
  });

  it('denies an update without a fresh server timestamp', async () => {
    await assertFails(updateDoc(entryRef(ownerDb()), { mastered: true }));
  });

  it('denies changing createdAt', async () => {
    await assertFails(
      updateDoc(entryRef(ownerDb()), {
        createdAt: Timestamp.fromMillis(2_000),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('denies another user updating the entry', async () => {
    const db = env.authenticatedContext(OTHER_UID).firestore() as unknown as Firestore;
    await assertFails(updateDoc(entryRef(db), { mastered: true, updatedAt: serverTimestamp() }));
  });
});

describe('delete', () => {
  it('denies hard deletes, even for the owner', async () => {
    await seedEntry();
    await assertFails(deleteDoc(entryRef(ownerDb())));
  });
});
