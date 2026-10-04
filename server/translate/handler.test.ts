// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { allerContent, garconContent } from '../../src/test/fixtures.ts';
import { AiError, type AiClient, type GenerateJsonOptions } from './aiClient.ts';
import { createTranslateHandler, type TranslateDeps } from './handler.ts';

const OWNER = 'owner-uid';

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
          : Promise.reject(new Error('invalid token')),
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
  it('generates an entry of the requested type with its schema', async () => {
    const { ai, calls } = fakeAi(allerContent);
    expect(await read(await handler(ai)(post(verbRequest)))).toEqual({
      status: 200,
      body: { content: allerContent },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.prompt).toBe('Italian verb: "andare"');
    expect(JSON.stringify(calls[0]?.schema)).toContain('"enum":["verb"]');
    expect(calls[0]?.system).toMatch(/vosotros/);
  });

  it('detects the type first when none is given', async () => {
    const { ai, calls } = fakeAi({ type: 'noun' }, garconContent);
    const response = await handler(ai)(post({ sourceLang: 'fr', text: 'garçon' }));
    expect(await read(response)).toEqual({ status: 200, body: { content: garconContent } });
    expect(calls.map((call) => call.prompt)).toEqual([
      expect.stringContaining('Classify'),
      'French noun: "garçon"',
    ]);
  });

  it('rejects output that does not match the entry schema', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const incomplete = { ...allerContent, translations: { ...allerContent.translations, es: [] } };
    expect(await read(await handler(fakeAi(incomplete).ai)(post(verbRequest)))).toEqual({
      status: 502,
      body: { error: 'invalid_output' },
    });
    // Output of another type than requested is invalid too.
    expect((await handler(fakeAi(garconContent).ai)(post(verbRequest))).status).toBe(502);
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
    ['quota', 429],
    ['timeout', 504],
    ['ai_unavailable', 503],
    ['invalid_output', 502],
  ] as const)('maps an AI %s error to %i', async (kind, status) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ai = fakeAi(new AiError(kind, 'boom')).ai;
    expect(await read(await handler(ai)(post(verbRequest)))).toEqual({
      status,
      body: { error: kind },
    });
  });

  it('hides unexpected errors behind ai_unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ai = fakeAi(new TypeError('bug')).ai;
    expect(await read(await handler(ai)(post(verbRequest)))).toEqual({
      status: 503,
      body: { error: 'ai_unavailable' },
    });
  });

  it('gives the AI an abort signal bounded by the timeout', async () => {
    const { ai, calls } = fakeAi(allerContent);
    await handler(ai, { timeoutMs: 1234 })(post(verbRequest));
    expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);
    expect(calls[0]?.signal.aborted).toBe(false);
  });

  it('never caches responses', async () => {
    const response = await handler(fakeAi(allerContent).ai)(post(verbRequest));
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
