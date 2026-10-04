import { z } from 'zod';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

/** Server-only configuration (Netlify environment variables, never VITE_). */
const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default(DEFAULT_GEMINI_MODEL),
  OWNER_UID: z.string().min(1),
  // The client config already holds the project id; FIREBASE_PROJECT_ID overrides it.
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1).optional(),
});

export interface ServerEnv {
  geminiApiKey: string;
  geminiModel: string;
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
    geminiModel: result.data.GEMINI_MODEL,
    ownerUid: result.data.OWNER_UID,
    projectId,
  };
}
