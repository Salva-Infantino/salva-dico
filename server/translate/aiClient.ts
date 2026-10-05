import { ApiError, FinishReason, GoogleGenAI } from '@google/genai';

/**
 * `blocked`: the model stopped without a usable answer (recitation filter, safety,
 * truncated output). Conjugation tables often trip the recitation filter.
 */
export type AiErrorKind = 'quota' | 'timeout' | 'invalid_output' | 'ai_unavailable' | 'blocked';

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

export interface GeminiClientOptions {
  apiKey: string;
  /**
   * Tried in order. The next model takes over when one is out of quota (free-tier
   * quotas are per model and per day), stays overloaded or keeps blocking its answer.
   */
  models: readonly string[];
  /** Attempts per model for transient failures (overload, recitation). */
  attemptsPerModel?: number;
  retryDelayMs?: number;
}

/** Transient failures worth another attempt on the same model. */
const RETRYABLE: ReadonlySet<AiErrorKind> = new Set(['ai_unavailable', 'blocked']);

export function createGeminiClient({
  apiKey,
  models,
  attemptsPerModel = 2,
  retryDelayMs = 800,
}: GeminiClientOptions): AiClient {
  const ai = new GoogleGenAI({ apiKey });

  async function attempt(model: string, options: GenerateJsonOptions): Promise<unknown> {
    const { system, prompt, schema, signal } = options;
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
      const finishReason = response.candidates?.[0]?.finishReason;
      text = response.text;
      if (finishReason !== undefined && finishReason !== FinishReason.STOP) {
        throw new AiError('blocked', `Gemini stopped with ${finishReason}`);
      }
    } catch (error) {
      throw toAiError(error, signal);
    }
    if (!text) throw new AiError('blocked', 'Gemini returned an empty answer');
    try {
      return JSON.parse(text) as unknown;
    } catch (error) {
      throw new AiError('invalid_output', 'Gemini did not return valid JSON', { cause: error });
    }
  }

  return {
    async generateJson(options) {
      let last: AiError = new AiError('ai_unavailable', 'No Gemini model configured');
      for (const model of models) {
        for (let i = 0; i < attemptsPerModel; i++) {
          try {
            return await attempt(model, options);
          } catch (error) {
            last = error instanceof AiError ? error : toAiError(error, options.signal);
            console.warn(`translate: ${model} ${last.kind} (attempt ${String(i + 1)})`);
            // Out of quota: this model is done for the day, try the next one.
            if (last.kind === 'quota') break;
            if (!RETRYABLE.has(last.kind)) throw last;
            await pause(retryDelayMs, options.signal);
          }
        }
      }
      throw last;
    },
  };
}

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new AiError('timeout', 'Gemini request aborted'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new AiError('timeout', 'Gemini request aborted'));
      },
      { once: true },
    );
  });
}

function toAiError(error: unknown, signal: AbortSignal): AiError {
  if (error instanceof AiError) return error;
  if (signal.aborted) return new AiError('timeout', 'Gemini request aborted', { cause: error });
  if (error instanceof ApiError && error.status === 429) {
    return new AiError('quota', 'Gemini quota exhausted', { cause: error });
  }
  return new AiError('ai_unavailable', 'Gemini request failed', { cause: error });
}
