/**
 * Local development against the Firebase Emulator Suite (`pnpm dev:emulators`).
 * Nothing here is a secret: these values only exist inside the local emulators.
 */
export const EMULATOR_PROJECT_ID = 'demo-salva-dico';

export const EMULATOR_HOSTS = {
  firestore: { host: '127.0.0.1', port: 8080 },
  auth: { host: '127.0.0.1', port: 9099 },
} as const;

/** Account created by the seed script, with the owner UID so the real rules apply unchanged. */
export const EMULATOR_OWNER = {
  email: 'owner@salva-dico.test',
  password: 'emulator-only-password',
} as const;
