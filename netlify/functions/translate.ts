import type { Config } from '@netlify/functions';
import { TRANSLATE_PATH } from '../../src/domain/translateApi.ts';
import { createIdTokenVerifier } from '../../server/firebaseAuth.ts';
import { createGeminiClient } from '../../server/translate/aiClient.ts';
import { parseServerEnv } from '../../server/translate/env.ts';
import { createTranslateHandler } from '../../server/translate/handler.ts';

let handler: ((request: Request) => Promise<Response>) | null = null;

/** Built on first call (reused while the function instance stays warm). */
function getHandler() {
  if (!handler) {
    const env = parseServerEnv(process.env);
    handler = createTranslateHandler({
      verifyIdToken: createIdTokenVerifier(env.projectId),
      ownerUid: env.ownerUid,
      ai: createGeminiClient({ apiKey: env.geminiApiKey, models: env.geminiModels }),
    });
  }
  return handler;
}

export default async (request: Request): Promise<Response> => {
  try {
    return await getHandler()(request);
  } catch (error) {
    // Misconfiguration (missing env var): logged server-side, generic error for the client.
    console.error('translate: cannot start', error);
    return Response.json({ error: 'ai_unavailable' }, { status: 503 });
  }
};

export const config: Config = {
  path: TRANSLATE_PATH,
  // Per visitor IP: far above personal use (one AI request takes several seconds), low
  // enough to cap the function invocations an anonymous script could burn.
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
