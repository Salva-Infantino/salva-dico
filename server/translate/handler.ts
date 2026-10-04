import { ENTRY_TYPES, type EntryType } from '../../src/domain/languages.ts';
import { entryContentVariants, type EntryContent } from '../../src/domain/schemas.ts';
import {
  translateRequestSchema,
  type TranslateErrorCode,
  type TranslateResponse,
} from '../../src/domain/translateApi.ts';
import { AiError, type AiClient } from './aiClient.ts';
import { entryJsonSchema, typeJsonSchema } from './geminiSchema.ts';
import { entryPrompt, SYSTEM_INSTRUCTION, typePrompt } from './prompt.ts';

export interface TranslateDeps {
  /** Verifies a Firebase ID token and returns its user id; throws when invalid. */
  verifyIdToken: (token: string) => Promise<{ uid: string }>;
  /** The only account allowed to spend the AI quota. */
  ownerUid: string;
  ai: AiClient;
  /** Stays under Netlify's 60 s limit for synchronous functions. */
  timeoutMs?: number;
}

const STATUS: Record<TranslateErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  quota: 429,
  timeout: 504,
  invalid_output: 502,
  ai_unavailable: 503,
};

function json(body: TranslateResponse, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

const fail = (error: TranslateErrorCode) => json({ error }, STATUS[error]);

/**
 * POST /api/translate. Order matters: the token and the owner are checked before
 * anything else, so nobody else can consume the Gemini quota.
 */
export function createTranslateHandler(deps: TranslateDeps) {
  const timeoutMs = deps.timeoutMs ?? 50_000;

  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    }

    const token = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1];
    if (!token) return fail('unauthorized');
    let uid: string;
    try {
      ({ uid } = await deps.verifyIdToken(token));
    } catch {
      return fail('unauthorized');
    }
    if (uid !== deps.ownerUid) return fail('forbidden');

    const body = translateRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail('bad_request');
    const { sourceLang, text, type } = body.data;

    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const entryType = type ?? (await detectType(deps.ai, sourceLang, text, signal));
      const content = await generateEntry(deps.ai, sourceLang, text, entryType, signal);
      return json({ content });
    } catch (error) {
      if (error instanceof AiError) {
        console.error(`translate: ${error.kind}`, error.cause ?? error.message);
        return fail(error.kind);
      }
      console.error('translate: unexpected error', error);
      return fail('ai_unavailable');
    }
  };
}

async function detectType(
  ai: AiClient,
  sourceLang: Parameters<typeof typePrompt>[0],
  text: string,
  signal: AbortSignal,
): Promise<EntryType> {
  const output = await ai.generateJson({
    system: SYSTEM_INSTRUCTION,
    prompt: typePrompt(sourceLang, text),
    schema: typeJsonSchema,
    signal,
  });
  const type = (output as { type?: unknown } | null)?.type;
  if (typeof type !== 'string' || !(ENTRY_TYPES as readonly string[]).includes(type)) {
    throw new AiError('invalid_output', 'Unknown entry type from the model');
  }
  return type as EntryType;
}

async function generateEntry(
  ai: AiClient,
  sourceLang: Parameters<typeof entryPrompt>[0],
  text: string,
  type: EntryType,
  signal: AbortSignal,
): Promise<EntryContent> {
  const output = await ai.generateJson({
    system: SYSTEM_INSTRUCTION,
    prompt: entryPrompt(sourceLang, text, type),
    schema: entryJsonSchema(type),
    signal,
  });
  // Same Zod schema as stored entries: invalid output never reaches the user.
  const result = entryContentVariants[type].safeParse(output);
  if (!result.success) {
    throw new AiError('invalid_output', 'Model output does not match the entry schema', {
      cause: result.error.issues,
    });
  }
  return result.data;
}
