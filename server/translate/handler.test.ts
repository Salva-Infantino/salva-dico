// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { EntryContent } from '../../src/domain/schemas.ts';
import { allerContent, garconContent, seLeverContent } from '../../src/test/fixtures.ts';
import { InvalidIdTokenError } from '../firebaseAuth.ts';
import { AiError, type AiClient, type GenerateJsonOptions } from './aiClient.ts';
import { createTranslateHandler, type TranslateDeps } from './handler.ts';

const OWNER = 'owner-uid';

type VerbContent = Extract<EntryContent, { type: 'verb' }>;

/** A Gemini stand-in returning queued outputs (or throwing queued errors). */
function fakeAi(...outputs: unknown[]) {
  const calls: GenerateJsonOptions[] = [];
  const ai: AiClient = {
    generateJson: (options) => {
      calls.push(options);
      const next = outputs.shift();
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
    },
  };
  return { ai, calls };
}

function handler(ai: AiClient, overrides: Partial<TranslateDeps> = {}) {
  return createTranslateHandler({
    verifyIdToken: (token) =>
      token === 'valid-owner'
        ? Promise.resolve({ uid: OWNER })
        : token === 'valid-other'
          ? Promise.resolve({ uid: 'someone-else' })
          : Promise.reject(new InvalidIdTokenError('invalid token')),
    ownerUid: OWNER,
    ai,
    ...overrides,
  });
}

function post(body: unknown, token: string | null = 'valid-owner') {
  return new Request('http://localhost/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function read(response: Response) {
  const body: unknown = await response.json();
  return { status: response.status, body };
}

const verbRequest = { sourceLang: 'it', text: 'andare', type: 'verb' };
const wordRequest = { sourceLang: 'fr', text: 'garçon', type: 'word' };

/** The AI outputs of a verb: the entry without romance conjugations, then fr, es, it. */
function verbOutputs(content: VerbContent = allerContent): unknown[] {
  const { fr, en, es, it } = content.translations;
  const strip = (list: readonly { conjugation: unknown }[]) =>
    list.map(({ conjugation, ...rest }) => rest);
  return [
    { type: 'verb', translations: { fr: strip(fr), en, es: strip(es), it: strip(it) } },
    fr[0]?.conjugation,
    es[0]?.conjugation,
    it[0]?.conjugation,
  ];
}

describe('POST /api/translate — access control', () => {
  it('only accepts POST', async () => {
    const response = await handler(fakeAi().ai)(new Request('http://localhost/api/translate'));
    expect(response.status).toBe(405);
  });

  it.each([
    ['no token', null],
    ['an invalid token', 'forged'],
  ])('rejects %s with 401, before calling the AI', async (_label, token) => {
    const { ai, calls } = fakeAi();
    expect(await read(await handler(ai)(post(verbRequest, token)))).toEqual({
      status: 401,
      body: { error: 'unauthorized' },
    });
    expect(calls).toHaveLength(0);
  });

  it('answers 503, not 401, when the token cannot be checked (keys unreachable)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ai, calls } = fakeAi();
    const offline = handler(ai, {
      verifyIdToken: () => Promise.reject(new TypeError('fetch failed')),
    });
    expect(await read(await offline(post(verbRequest, 'valid-owner')))).toEqual({
      status: 503,
      body: { error: 'ai_unavailable' },
    });
    expect(calls).toHaveLength(0);
  });

  it('rejects a valid token of another user with 403, before calling the AI', async () => {
    const { ai, calls } = fakeAi();
    expect(await read(await handler(ai)(post(verbRequest, 'valid-other')))).toEqual({
      status: 403,
      body: { error: 'forbidden' },
    });
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['missing text', { sourceLang: 'fr' }],
    ['blank text', { sourceLang: 'fr', text: '   ' }],
    ['text too long', { sourceLang: 'fr', text: 'x'.repeat(101) }],
    ['unknown language', { sourceLang: 'de', text: 'Haus' }],
    ['unknown type', { sourceLang: 'fr', text: 'vite', type: 'adverb' }],
  ])('rejects a bad request (%s) with 400', async (_label, body) => {
    expect((await handler(fakeAi().ai)(post(body))).status).toBe(400);
  });
});

describe('POST /api/translate — generation', () => {
  it('generates an entry of the requested type with its schema, in one request', async () => {
    const { ai, calls } = fakeAi(garconContent);
    expect(await read(await handler(ai)(post(wordRequest)))).toEqual({
      status: 200,
      body: { content: garconContent },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.prompt).toBe('French word: "garçon"');
    expect(JSON.stringify(calls[0]?.schema)).toContain('"enum":["word"]');
    expect(calls[0]?.system).toMatch(/vosotros/);
  });

  it('generates a verb in several requests: the entry, then one per conjugation', async () => {
    const { ai, calls } = fakeAi(...verbOutputs());
    expect(await read(await handler(ai)(post(verbRequest)))).toEqual({
      status: 200,
      body: { content: allerContent },
    });
    expect(calls.map((call) => call.prompt)).toEqual([
      'Italian verb: "andare"',
      'Conjugation of the French verb "aller" (go).',
      'Conjugation of the Spanish verb "ir" (go).',
      'Conjugation of the Italian verb "andare" (go).',
    ]);
    // The first request does not ask for the long romance conjugations.
    expect(JSON.stringify(calls[0]?.schema)).not.toContain('passatoProssimo');
  });

  it('mentions the reflexive pronoun when conjugating a reflexive verb', async () => {
    const { ai, calls } = fakeAi(...verbOutputs(seLeverContent));
    const response = await handler(ai)(post({ sourceLang: 'fr', text: 'se lever', type: 'verb' }));
    expect(response.status).toBe(200);
    expect(calls[1]?.prompt).toBe(
      'Conjugation of the French verb "se lever" (get up). It is reflexive: keep the reflexive pronoun in every form.',
    );
  });

  it('rejects an invalid conjugation', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const outputs = verbOutputs();
    const { ai } = fakeAi(...outputs.slice(0, 3), { presente: ['vado'] });
    expect(await read(await handler(ai)(post(verbRequest)))).toEqual({
      status: 502,
      body: { error: 'invalid_output' },
    });
  });

  it('detects the type first when none is given', async () => {
    const { ai, calls } = fakeAi({ type: 'word' }, garconContent);
    const response = await handler(ai)(post({ sourceLang: 'fr', text: 'garçon' }));
    expect(await read(response)).toEqual({ status: 200, body: { content: garconContent } });
    expect(calls.map((call) => call.prompt)).toEqual([
      expect.stringContaining('Classify'),
      'French word: "garçon"',
    ]);
  });

  it('rejects output that does not match the entry schema', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const incomplete = {
      ...garconContent,
      translations: { ...garconContent.translations, es: [] },
    };
    expect(await read(await handler(fakeAi(incomplete).ai)(post(wordRequest)))).toEqual({
      status: 502,
      body: { error: 'invalid_output' },
    });
    // Output of another type than requested is invalid too.
    expect((await handler(fakeAi(allerContent).ai)(post(wordRequest))).status).toBe(502);
    expect(error).toHaveBeenCalled();
  });

  it('rejects an unknown detected type', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handler(fakeAi({ type: 'adverb' }).ai)(
      post({ sourceLang: 'fr', text: 'vite' }),
    );
    expect(await read(response)).toEqual({ status: 502, body: { error: 'invalid_output' } });
  });

  it.each([
    ['quota', 429, 'quota'],
    ['timeout', 504, 'timeout'],
    ['ai_unavailable', 503, 'ai_unavailable'],
    ['invalid_output', 502, 'invalid_output'],
    ['blocked', 502, 'invalid_output'],
  ] as const)('maps an AI %s error to %i', async (kind, status, error) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ai = fakeAi(new AiError(kind, 'boom')).ai;
    expect(await read(await handler(ai)(post(wordRequest)))).toEqual({
      status,
      body: { error },
    });
  });

  it('tells which quota was hit, with Retry-After for a per-minute limit', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const minute = new AiError('quota', 'boom', {
      quota: { scope: 'minute', retryAfterSeconds: 36 },
    });
    const response = await handler(fakeAi(minute).ai)(post(wordRequest));
    expect(response.headers.get('Retry-After')).toBe('36');
    expect(await read(response)).toEqual({
      status: 429,
      body: { error: 'quota', quota: { scope: 'minute', retryAfterSeconds: 36 } },
    });

    const day = new AiError('quota', 'boom', { quota: { scope: 'day' } });
    const dayResponse = await handler(fakeAi(day).ai)(post(wordRequest));
    expect(dayResponse.headers.get('Retry-After')).toBeNull();
    expect((await read(dayResponse)).body).toEqual({ error: 'quota', quota: { scope: 'day' } });
  });

  it('hides unexpected errors behind ai_unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ai = fakeAi(new TypeError('bug')).ai;
    expect(await read(await handler(ai)(post(wordRequest)))).toEqual({
      status: 503,
      body: { error: 'ai_unavailable' },
    });
  });

  it('gives the AI an abort signal bounded by the timeout', async () => {
    const { ai, calls } = fakeAi(garconContent);
    await handler(ai, { timeoutMs: 1234 })(post(wordRequest));
    expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);
    expect(calls[0]?.signal.aborted).toBe(false);
  });

  it('never caches responses', async () => {
    const response = await handler(fakeAi(garconContent).ai)(post(wordRequest));
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
