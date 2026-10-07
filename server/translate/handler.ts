import { ENTRY_TYPES, type EntryType, type RomanceLang } from '../../src/domain/languages.ts';
import { entryContentVariants, type EntryContent } from '../../src/domain/schemas.ts';
import {
  translateRequestSchema,
  type QuotaInfo,
  type TranslateErrorCode,
  type TranslateResponse,
} from '../../src/domain/translateApi.ts';
import { InvalidIdTokenError } from '../firebaseAuth.ts';
import { AiError, type AiClient } from './aiClient.ts';
import {
  CONJUGATION_SCHEMAS,
  conjugationJsonSchema,
  entryJsonSchema,
  typeJsonSchema,
  verbBaseJsonSchema,
  verbBaseSchema,
} from './geminiSchema.ts';
import { conjugationPrompt, entryPrompt, SYSTEM_INSTRUCTION, typePrompt } from './prompt.ts';

export interface TranslateDeps {
  /**
   * Verifies a Firebase ID token and returns its user id. Throws InvalidIdTokenError for
   * a bad token; any other error (keys unreachable…) is a server-side problem.
   */
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

function json(
  body: TranslateResponse,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

const fail = (error: TranslateErrorCode) => json({ error }, STATUS[error]);

/** Tells the client which limit was hit, so it can say when to retry. */
function failQuota(quota: QuotaInfo | undefined): Response {
  if (!quota) return fail('quota');
  const retryAfter = quota.retryAfterSeconds;
  return json(
    { error: 'quota', quota },
    STATUS.quota,
    retryAfter === undefined ? {} : { 'Retry-After': String(retryAfter) },
  );
}

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
    } catch (error) {
      if (error instanceof InvalidIdTokenError) return fail('unauthorized');
      console.error('translate: cannot verify the ID token', error);
      return fail('ai_unavailable');
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
        // A blocked answer (recitation filter…) is reported like any unusable output.
        if (error.kind === 'quota') return failQuota(error.quota);
        return fail(error.kind === 'blocked' ? 'invalid_output' : error.kind);
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
  if (type === 'verb') return generateVerb(ai, sourceLang, text, signal);
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

async function generateVerb(
  ai: AiClient,
  sourceLang: Parameters<typeof entryPrompt>[0],
  text: string,
  signal: AbortSignal,
): Promise<EntryContent> {
  const base = verbBaseSchema.safeParse(
    await ai.generateJson({
      system: SYSTEM_INSTRUCTION,
      prompt: entryPrompt(sourceLang, text, 'verb'),
      schema: verbBaseJsonSchema(),
      signal,
    }),
  );
  if (!base.success) {
    throw new AiError('invalid_output', 'Verb output does not match the schema', {
      cause: base.error.issues,
    });
  }
  const { translations } = base.data;
  const meaning = translations.en[0]?.text;

  // One request per conjugation, in parallel to stay well under the time limit.
  // The assembled entry is validated as a whole below.
  const conjugate = (lang: RomanceLang): Promise<unknown[]> =>
    Promise.all(
      translations[lang].map(async (translation) => {
        const output = await ai.generateJson({
          system: SYSTEM_INSTRUCTION,
          prompt: conjugationPrompt(
            lang,
            translation.text,
            meaning,
            translation.reflexive === true,
          ),
          schema: conjugationJsonSchema(lang),
          signal,
        });
        const conjugation = CONJUGATION_SCHEMAS[lang].safeParse(output);
        if (!conjugation.success) {
          throw new AiError('invalid_output', `Invalid ${lang} conjugation`, {
            cause: conjugation.error.issues,
          });
        }
        return { ...translation, conjugation: conjugation.data };
      }),
    );
  const [fr, es, it] = await Promise.all([conjugate('fr'), conjugate('es'), conjugate('it')]);

  const content = entryContentVariants.verb.safeParse({
    type: 'verb',
    translations: { fr, en: translations.en, es, it },
  });
  if (!content.success) {
    throw new AiError('invalid_output', 'Assembled verb does not match the entry schema', {
      cause: content.error.issues,
    });
  }
  return content.data;
}
