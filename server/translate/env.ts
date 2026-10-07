import { z } from 'zod';

/**
 * Tried in order: the next one takes over when one is overloaded, too slow or out of quota.
 * Flash-Lite first: its free tier allows 15 requests per minute and 500 per day, against 5
 * and 20 for Flash models, and a verb takes 4 or 5 requests at once. Its conjugations were
 * checked against Flash (2026-10-07). The Flash models are fallbacks, each with its own quota.
 */
export const DEFAULT_GEMINI_MODELS =
  'gemini-3.5-flash-lite,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash';

/** Server-only configuration (Netlify environment variables, never VITE_). */
const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  /** Comma-separated list of models, tried in order. */
  GEMINI_MODEL: z
    .string()
    .default(DEFAULT_GEMINI_MODELS)
    .transform((value) =>
      value
        .split(',')
        .map((model) => model.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string()).min(1)),
  OWNER_UID: z.string().min(1),
  // The client config already holds the project id; FIREBASE_PROJECT_ID overrides it.
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  /** Set by the local dev server only: unsigned Auth emulator tokens are then accepted. */
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
});

export interface ServerEnv {
  geminiApiKey: string;
  geminiModels: string[];
  ownerUid: string;
  projectId: string;
  /** Local Auth emulator (dev server only, demo project): tokens are unsigned. */
  authEmulator: boolean;
}

export function parseServerEnv(env: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(env);
  const projectId = result.data?.FIREBASE_PROJECT_ID ?? result.data?.VITE_FIREBASE_PROJECT_ID;
  if (!result.success || !projectId) {
    const missing = result.success
      ? 'FIREBASE_PROJECT_ID'
      : result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid server configuration: ${missing}`);
  }
  // With FIREBASE_AUTH_EMULATOR_HOST, token signatures are not checked (emulator tokens
  // are unsigned): anyone could forge a token for the (public) owner UID. Only allowed
  // with a demo project, which exists in the emulators only and can never be real.
  if (result.data.FIREBASE_AUTH_EMULATOR_HOST && !projectId.startsWith('demo-')) {
    throw new Error(
      'Invalid server configuration: FIREBASE_AUTH_EMULATOR_HOST must not be set for a real project',
    );
  }
  return {
    geminiApiKey: result.data.GEMINI_API_KEY,
    geminiModels: result.data.GEMINI_MODEL,
    ownerUid: result.data.OWNER_UID,
    projectId,
    authEmulator: Boolean(result.data.FIREBASE_AUTH_EMULATOR_HOST),
  };
}
