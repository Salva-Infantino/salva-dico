import { ApiError, GoogleGenAI } from '@google/genai';

export type AiErrorKind = 'quota' | 'timeout' | 'invalid_output' | 'ai_unavailable';

export class AiError extends Error {
  readonly kind: AiErrorKind;

  constructor(kind: AiErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AiError';
    this.kind = kind;
  }
}

export interface GenerateJsonOptions {
  system: string;
  prompt: string;
  /** JSON Schema of the expected output (Gemini-compatible subset). */
  schema: unknown;
  signal: AbortSignal;
}

/** The only AI capability the function needs; mocked in tests. */
export interface AiClient {
  generateJson(options: GenerateJsonOptions): Promise<unknown>;
}

export function createGeminiClient({ apiKey, model }: { apiKey: string; model: string }): AiClient {
  const ai = new GoogleGenAI({ apiKey });
  return {
    async generateJson({ system, prompt, schema, signal }) {
      let text: string | undefined;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: system,
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            abortSignal: signal,
          },
        });
        text = response.text;
      } catch (error) {
        throw toAiError(error, signal);
      }
      try {
        return JSON.parse(text ?? '') as unknown;
      } catch (error) {
        throw new AiError('invalid_output', 'Gemini did not return valid JSON', { cause: error });
      }
    },
  };
}

function toAiError(error: unknown, signal: AbortSignal): AiError {
  if (signal.aborted) return new AiError('timeout', 'Gemini request aborted', { cause: error });
  if (error instanceof ApiError && error.status === 429) {
    return new AiError('quota', 'Gemini quota exhausted', { cause: error });
  }
  return new AiError('ai_unavailable', 'Gemini request failed', { cause: error });
}
