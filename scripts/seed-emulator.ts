/**
 * Seeds the local Firebase emulators (never the real project): creates the owner
 * account in the Auth emulator and writes development entries to Firestore.
 *
 * Runs inside `firebase emulators:exec`, which sets FIRESTORE_EMULATOR_HOST.
 * Usage: node scripts/seed-emulator.ts [--bulk <count>]
 */
import { collection, doc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import { EMULATOR_HOSTS, EMULATOR_OWNER, EMULATOR_PROJECT_ID } from '../src/config/emulator.ts';
import { newEntryDoc } from '../src/data/entryDoc.ts';
import { headwords } from '../src/domain/forms.ts';
import type { EntryContent } from '../src/domain/schemas.ts';
import { createTestEnv, OWNER_UID } from '../tests/emulator/testEnv.ts';
import { MASTERED_FR, SEED_CONTENTS, syntheticContent } from './seed-data.ts';

const BATCH_SIZE = 400;

async function createOwnerAccount(): Promise<void> {
  const { host, port } = EMULATOR_HOSTS.auth;
  // Admin endpoint of the Auth emulator: "Bearer owner" is accepted by the emulator only.
  const response = await fetch(
    `http://${host}:${String(port)}/identitytoolkit.googleapis.com/v1/projects/${EMULATOR_PROJECT_ID}/accounts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ localId: OWNER_UID, ...EMULATOR_OWNER }),
    },
  );
  if (!response.ok && !(await response.text()).includes('DUPLICATE')) {
    throw new Error(`Could not create the emulator owner account (${String(response.status)})`);
  }
}

async function writeEntries(db: Firestore, contents: readonly EntryContent[]): Promise<void> {
  const entries = collection(db, 'users', OWNER_UID, 'entries');
  for (let start = 0; start < contents.length; start += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const content of contents.slice(start, start + BATCH_SIZE)) {
      const mastered = headwords(content, 'fr').some((word) => MASTERED_FR.has(word));
      batch.set(doc(entries), { ...newEntryDoc(content), mastered, updatedAt: serverTimestamp() });
    }
    await batch.commit();
  }
}

function bulkCount(args: readonly string[]): number {
  const index = args.indexOf('--bulk');
  const count = index === -1 ? 0 : Number(args[index + 1]);
  if (!Number.isInteger(count) || count < 0) throw new Error('--bulk expects a positive integer');
  return count;
}

const synthetic = Array.from({ length: bulkCount(process.argv.slice(2)) }, (_, i) =>
  syntheticContent(i + 1),
);

await createOwnerAccount();
const env = await createTestEnv();
await env.withSecurityRulesDisabled(async (context) => {
  await writeEntries(context.firestore() as unknown as Firestore, [...SEED_CONTENTS, ...synthetic]);
});
await env.cleanup();
console.log(
  `Seeded ${String(SEED_CONTENTS.length + synthetic.length)} entries for ${EMULATOR_OWNER.email}`,
);
