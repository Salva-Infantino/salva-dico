import { z } from 'zod';

/**
 * Client configuration, validated once at startup so a missing variable fails
 * loudly instead of producing a confusing Firebase error later.
 * Every VITE_ variable is bundled into the client: nothing here may be secret.
 */
const envSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_USE_EMULATORS: z.enum(['true', 'false']).optional(),
  VITE_EMULATOR_RUN_ID: z.string().regex(/^\w+$/).optional(),
});

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export interface ClientEnv {
  firebase: FirebaseWebConfig;
  /** Connect to the local Firebase emulators instead of the real project. */
  useEmulators: boolean;
  /**
   * Firebase app name. Each emulator run starts from an empty database, so it gets its
   * own name: the local cache (IndexedDB) and sync cursor are keyed by it, and data
   * cached from a previous run can never show up as ghost entries.
   */
  appName: string;
}

export function parseClientEnv(env: Record<string, unknown>): ClientEnv {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid Firebase configuration, check .env.local: ${missing}`);
  }
  const vars = result.data;
  return {
    firebase: {
      apiKey: vars.VITE_FIREBASE_API_KEY,
      authDomain: vars.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: vars.VITE_FIREBASE_PROJECT_ID,
      appId: vars.VITE_FIREBASE_APP_ID,
    },
    useEmulators: vars.VITE_USE_EMULATORS === 'true',
    appName:
      vars.VITE_USE_EMULATORS === 'true'
        ? `emulator-${vars.VITE_EMULATOR_RUN_ID ?? 'default'}`
        : '[DEFAULT]',
  };
}
