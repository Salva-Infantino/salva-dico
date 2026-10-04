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
});

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export function parseFirebaseConfig(env: Record<string, unknown>): FirebaseWebConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid Firebase configuration, check .env.local: ${missing}`);
  }
  const vars = result.data;
  return {
    apiKey: vars.VITE_FIREBASE_API_KEY,
    authDomain: vars.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: vars.VITE_FIREBASE_PROJECT_ID,
    appId: vars.VITE_FIREBASE_APP_ID,
  };
}
