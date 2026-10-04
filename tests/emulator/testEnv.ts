import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

export const PROJECT_ID = 'demo-salva-dico';
export const RULES = readFileSync('firestore.rules', 'utf8');

/** The owner UID is a literal in the rules: tests read it from there to stay in sync. */
export const OWNER_UID = (() => {
  const match = /function ownerUid\(\) \{\s*return '([^']+)';/.exec(RULES);
  if (!match?.[1]) throw new Error('ownerUid() not found in firestore.rules');
  return match[1];
})();

export function createTestEnv(): Promise<RulesTestEnvironment> {
  // Host and port come from FIRESTORE_EMULATOR_HOST, set by `firebase emulators:exec`.
  return initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: RULES } });
}
