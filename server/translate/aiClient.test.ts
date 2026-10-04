// @vitest-environment node
import { ApiError } from '@google/genai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiError, createGeminiClient } from './aiClient.ts';

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

const options = () => ({
  system: 'rules',
  prompt: 'French noun: "chat"',
  schema: { type: 'object' },
  signal: new AbortController().signal,
});

async function failure(promise: Promise<unknown>): Promise<AiError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  if (!(error instanceof AiError)) throw new Error('Expected an AiError');
  return error;
}

describe('createGeminiClient', () => {
  beforeEach(() => {
    generateContent.mockReset();
  });

  it('requests JSON output with the schema and the system instruction', async () => {
    generateContent.mockResolvedValue({ text: '{"type":"noun"}' });
    const client = createGeminiClient({ apiKey: 'key', model: 'gemini-test' });
    await expect(client.generateJson(options())).resolves.toEqual({ type: 'noun' });
    expect(generateContent).toHaveBeenCalledWith({
      model: 'gemini-test',
      contents: 'French noun: "chat"',
      config: expect.objectContaining({
        systemInstruction: 'rules',
        responseMimeType: 'application/json',
        responseJsonSchema: { type: 'object' },
      }) as unknown,
    });
  });

  it('reports invalid JSON as invalid output', async () => {
    generateContent.mockResolvedValue({ text: 'not json' });
    const client = createGeminiClient({ apiKey: 'key', model: 'm' });
    expect((await failure(client.generateJson(options()))).kind).toBe('invalid_output');
  });

  it('reports HTTP 429 as quota and other API errors as unavailable', async () => {
    const client = createGeminiClient({ apiKey: 'key', model: 'm' });
    generateContent.mockRejectedValueOnce(new ApiError({ message: 'quota', status: 429 }));
    expect((await failure(client.generateJson(options()))).kind).toBe('quota');
    generateContent.mockRejectedValueOnce(new ApiError({ message: 'down', status: 503 }));
    expect((await failure(client.generateJson(options()))).kind).toBe('ai_unavailable');
  });

  it('reports an aborted request as a timeout', async () => {
    const controller = new AbortController();
    controller.abort();
    generateContent.mockRejectedValue(new Error('aborted'));
    const client = createGeminiClient({ apiKey: 'key', model: 'm' });
    const error = await failure(client.generateJson({ ...options(), signal: controller.signal }));
    expect(error.kind).toBe('timeout');
  });
});
