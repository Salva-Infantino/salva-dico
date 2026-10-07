// @vitest-environment node
import { ApiError } from '@google/genai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiError, createGeminiClient, quotaInfo } from './aiClient.ts';

const generateContent = vi.fn();

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  return {
    ...actual,
    GoogleGenAI: class {
      models = { generateContent };
    },
  };
});

const options = (signal = new AbortController().signal) => ({
  system: 'rules',
  prompt: 'French word: "chat"',
  schema: { type: 'object' },
  signal,
});

const answer = (text: string, finishReason = 'STOP') => ({
  text,
  candidates: [{ finishReason }],
});

function client(models = ['model-a', 'model-b'], attemptTimeoutMs = 10_000) {
  return createGeminiClient({ apiKey: 'key', models, retryDelayMs: 0, attemptTimeoutMs });
}

/** A Gemini call that never answers until its abort signal fires. */
function hang({ config }: { config: { abortSignal: AbortSignal } }): Promise<never> {
  return new Promise((_, reject) => {
    config.abortSignal.addEventListener('abort', () => {
      reject(new Error('aborted'));
    });
  });
}

async function failure(promise: Promise<unknown>): Promise<AiError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  if (!(error instanceof AiError)) throw new Error('Expected an AiError');
  return error;
}

/** A real 429 body from the Gemini API (free tier), as the SDK puts it in the message. */
function quotaError(quotaId: string, retryDelay?: string) {
  const details: unknown[] = [
    {
      '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
      violations: [{ quotaId, quotaValue: '5' }],
    },
  ];
  if (retryDelay) details.push({ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay });
  const body = { error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'quota', details } };
  return new ApiError({ message: JSON.stringify(body), status: 429 });
}
const PER_MINUTE = 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier';
const PER_DAY = 'GenerateRequestsPerDayPerProjectPerModel-FreeTier';

const calledModels = () =>
  generateContent.mock.calls.map((call) => (call[0] as { model: string }).model);

describe('createGeminiClient', () => {
  beforeEach(() => {
    generateContent.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('requests JSON output with the schema and the system instruction', async () => {
    generateContent.mockResolvedValue(answer('{"type":"word"}'));
    await expect(client().generateJson(options())).resolves.toEqual({ type: 'word' });
    expect(generateContent).toHaveBeenCalledWith({
      model: 'model-a',
      contents: 'French word: "chat"',
      config: expect.objectContaining({
        systemInstruction: 'rules',
        responseMimeType: 'application/json',
        responseJsonSchema: { type: 'object' },
      }) as unknown,
    });
  });

  it('reports invalid JSON as invalid output, without retrying', async () => {
    generateContent.mockResolvedValue(answer('not json'));
    expect((await failure(client().generateJson(options()))).kind).toBe('invalid_output');
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it('retries a blocked answer (recitation), then falls back to the next model', async () => {
    generateContent
      .mockResolvedValueOnce(answer('', 'RECITATION'))
      .mockResolvedValueOnce(answer('', 'RECITATION'))
      .mockResolvedValueOnce(answer('{"ok":true}'));
    await expect(client().generateJson(options())).resolves.toEqual({ ok: true });
    expect(calledModels()).toEqual(['model-a', 'model-a', 'model-b']);
  });

  it('retries an overloaded model (503), then falls back to the next model', async () => {
    generateContent
      .mockRejectedValueOnce(new ApiError({ message: 'busy', status: 503 }))
      .mockResolvedValueOnce(answer('{"ok":true}'));
    await expect(client().generateJson(options())).resolves.toEqual({ ok: true });
    expect(calledModels()).toEqual(['model-a', 'model-a']);
  });

  it('gives up with the last error when every model fails', async () => {
    generateContent.mockRejectedValue(new ApiError({ message: 'busy', status: 503 }));
    expect((await failure(client().generateJson(options()))).kind).toBe('ai_unavailable');
    expect(generateContent).toHaveBeenCalledTimes(4);

    generateContent.mockReset();
    generateContent.mockResolvedValue(answer('', 'RECITATION'));
    expect((await failure(client().generateJson(options()))).kind).toBe('blocked');
  });

  it('moves to the next model when one is out of quota (429), without retrying it', async () => {
    generateContent
      .mockRejectedValueOnce(new ApiError({ message: 'quota', status: 429 }))
      .mockResolvedValueOnce(answer('{"ok":true}'));
    await expect(client().generateJson(options())).resolves.toEqual({ ok: true });
    expect(calledModels()).toEqual(['model-a', 'model-b']);
  });

  it('reports quota when every model is out of quota', async () => {
    generateContent.mockRejectedValue(new ApiError({ message: 'quota', status: 429 }));
    expect((await failure(client().generateJson(options()))).kind).toBe('quota');
    expect(calledModels()).toEqual(['model-a', 'model-b']);
  });

  it('reports an aborted request as a timeout, without retrying', async () => {
    const controller = new AbortController();
    controller.abort();
    generateContent.mockRejectedValue(new Error('aborted'));
    const error = await failure(client().generateJson(options(controller.signal)));
    expect(error.kind).toBe('timeout');
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it('leaves a model that does not answer in time for the next one, without retrying it', async () => {
    generateContent.mockImplementationOnce(hang).mockResolvedValueOnce(answer('{"ok":true}'));
    await expect(client(['model-a', 'model-b'], 20).generateJson(options())).resolves.toEqual({
      ok: true,
    });
    expect(calledModels()).toEqual(['model-a', 'model-b']);
  });

  it('reports a timeout when no model answers in time', async () => {
    generateContent.mockImplementation(hang);
    const error = await failure(client(['model-a', 'model-b'], 20).generateJson(options()));
    expect(error.kind).toBe('timeout');
    expect(calledModels()).toEqual(['model-a', 'model-b']);
  });

  it('stops at the overall deadline, even within the attempt limit', async () => {
    generateContent.mockImplementation(hang);
    const error = await failure(
      client(['model-a', 'model-b'], 10_000).generateJson(options(AbortSignal.timeout(20))),
    );
    expect(error.kind).toBe('timeout');
    expect(calledModels()).toEqual(['model-a']);
  });

  it('says which limit stopped every model: the soonest retry when one is per minute', async () => {
    generateContent
      .mockRejectedValueOnce(quotaError(PER_DAY))
      .mockRejectedValueOnce(quotaError(PER_MINUTE, '36.3s'));
    const error = await failure(client().generateJson(options()));
    expect(error.kind).toBe('quota');
    expect(error.quota).toEqual({ scope: 'minute', retryAfterSeconds: 37 });
  });

  it('says the day is over when every model is out of its daily quota', async () => {
    generateContent.mockRejectedValue(quotaError(PER_DAY));
    expect((await failure(client().generateJson(options()))).quota).toEqual({ scope: 'day' });
  });
});

describe('quotaInfo', () => {
  it('reads a per-minute limit and its retry delay', () => {
    expect(quotaInfo(quotaError(PER_MINUTE, '36s').message)).toEqual({
      scope: 'minute',
      retryAfterSeconds: 36,
    });
  });

  it('reads a daily limit', () => {
    expect(quotaInfo(quotaError(PER_DAY).message)).toEqual({ scope: 'day' });
  });

  it('ignores unknown or missing details', () => {
    expect(quotaInfo('quota')).toBeUndefined();
    expect(quotaInfo(quotaError('SomethingElse').message)).toBeUndefined();
    expect(quotaInfo(JSON.stringify({ error: { code: 429 } }))).toBeUndefined();
  });
});
