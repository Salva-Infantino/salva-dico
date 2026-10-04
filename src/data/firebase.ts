import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { parseFirebaseConfig, type FirebaseWebConfig } from '../config/env.ts';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  config: FirebaseWebConfig;
}

let services: FirebaseServices | null = null;

/** Lazily initialized, so importing modules has no side effect (tests, SSR-free tooling). */
export function getFirebase(): FirebaseServices {
  if (services) return services;

  const config = parseFirebaseConfig(import.meta.env);
  const app = initializeApp(config);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      // The delta sync never re-downloads entries already synced, so the cache must
      // never evict them: garbage collection is disabled.
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    }),
  });
  services = { app, auth: getAuth(app), db, config };
  return services;
}

/**
 * Asks the browser not to evict this origin's storage (Firestore cache included)
 * under storage pressure. Best effort: the browser may refuse, and the delta sync
 * recovers from an evicted cache anyway.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}
