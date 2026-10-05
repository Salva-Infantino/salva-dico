import { z } from 'zod';

/** Tried in order: the second one takes over when the first is overloaded. */
export const DEFAULT_GEMINI_MODELS = 'gemini-3.8-flash,gemini-3.5-flash';

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
});

export interface ServerEnv {
  geminiApiKey: string;
  geminiModels: string[];
  ownerUid: string;
  projectId: string;
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
  return {
    geminiApiKey: result.data.GEMINI_API_KEY,
    geminiModels: result.data.GEMINI_MODEL,
    ownerUid: result.data.OWNER_UID,
    projectId,
  };
}
