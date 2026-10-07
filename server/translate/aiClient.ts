import { ApiError, FinishReason, GoogleGenAI } from '@google/genai';
import type { QuotaInfo } from '../../src/domain/translateApi.ts';

/**
 * `blocked`: the model stopped without a usable answer (recitation filter, safety,
 * truncated output). Conjugation tables often trip the recitation filter.
 */
export type AiErrorKind = 'quota' | 'timeout' | 'invalid_output' | 'ai_unavailable' | 'blocked';

export class AiError extends Error {
  readonly kind: AiErrorKind;
  /** For `quota`: which limit was hit, when the provider said so. */
  readonly quota: QuotaInfo | undefined;

  constructor(kind: AiErrorKind, message: string, options?: ErrorOptions & { quota?: QuotaInfo }) {
    super(message, options);
    this.name = 'AiError';
    this.kind = kind;
    this.quota = options?.quota;
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
  /**
   * Limit for one attempt, within the caller's overall signal. A model that does not
   * answer in time is left for the next one, so it cannot use up the whole budget.
   */
  attemptTimeoutMs?: number;
}

/** Transient failures worth another attempt on the same model. */
const RETRYABLE: ReadonlySet<AiErrorKind> = new Set(['ai_unavailable', 'blocked']);

export function createGeminiClient({
  apiKey,
  models,
  attemptsPerModel = 2,
  retryDelayMs = 800,
  attemptTimeoutMs = 25_000,
}: GeminiClientOptions): AiClient {
  const ai = new GoogleGenAI({ apiKey });

  async function attempt(model: string, options: GenerateJsonOptions): Promise<unknown> {
    const { system, prompt, schema } = options;
    const signal = AbortSignal.any([options.signal, AbortSignal.timeout(attemptTimeoutMs)]);
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
      const quotas: QuotaInfo[] = [];
      for (const model of models) {
        for (let i = 0; i < attemptsPerModel; i++) {
          try {
            return await attempt(model, options);
          } catch (error) {
            last = error instanceof AiError ? error : toAiError(error, options.signal);
            console.warn(`translate: ${model} ${last.kind} (attempt ${String(i + 1)})`);
            if (last.quota) quotas.push(last.quota);
            // The overall time is up: no model can answer anymore.
            if (options.signal.aborted) throw last;
            // Out of quota (done for the day) or too slow (stuck or overloaded): try the
            // next model.
            if (last.kind === 'quota' || last.kind === 'timeout') break;
            if (!RETRYABLE.has(last.kind)) throw last;
            await pause(retryDelayMs, options.signal);
          }
        }
      }
      if (last.kind === 'quota') {
        const quota = mostHelpfulQuota(quotas);
        throw new AiError('quota', last.message, { cause: last, ...(quota && { quota }) });
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
    const quota = quotaInfo(error.message);
    return new AiError('quota', 'Gemini quota exhausted', {
      cause: error,
      ...(quota && { quota }),
    });
  }
  return new AiError('ai_unavailable', 'Gemini request failed', { cause: error });
}

/**
 * Reads which free-tier limit a 429 is about. The SDK's message is the JSON error body:
 * a google.rpc.QuotaFailure names the quota (…PerMinute… or …PerDay…) and a
 * google.rpc.RetryInfo gives the delay before retrying (e.g. "36s").
 */
export function quotaInfo(message: string): QuotaInfo | undefined {
  let body: unknown;
  try {
    body = JSON.parse(message.slice(message.indexOf('{')));
  } catch {
    return undefined;
  }
  const details = (body as { error?: { details?: unknown } } | null)?.error?.details;
  if (!Array.isArray(details)) return undefined;
  let scope: QuotaInfo['scope'] | undefined;
  let retryAfterSeconds: number | undefined;
  for (const detail of details as Record<string, unknown>[]) {
    const type = String(detail['@type']);
    if (type.endsWith('google.rpc.QuotaFailure') && Array.isArray(detail.violations)) {
      const ids = (detail.violations as { quotaId?: unknown }[]).map((v) => String(v.quotaId));
      // A daily limit outlasts a per-minute one: it decides when to retry.
      if (ids.some((id) => id.includes('PerDay'))) scope = 'day';
      else if (ids.some((id) => id.includes('PerMinute'))) scope = 'minute';
    }
    if (type.endsWith('google.rpc.RetryInfo')) {
      const seconds = /^(\d+(?:\.\d+)?)s$/.exec(String(detail.retryDelay))?.[1];
      if (seconds !== undefined) retryAfterSeconds = Math.ceil(Number(seconds));
    }
  }
  if (!scope) return undefined;
  return scope === 'minute' && retryAfterSeconds !== undefined
    ? { scope, retryAfterSeconds }
    : { scope };
}

/**
 * When every model is out of quota: if one of them is only blocked for the minute, the
 * soonest retry is what matters; otherwise the day is over for all of them.
 */
function mostHelpfulQuota(quotas: readonly QuotaInfo[]): QuotaInfo | undefined {
  const minute = quotas.filter((quota) => quota.scope === 'minute');
  if (minute.length > 0) {
    const delays = minute.flatMap((quota) => quota.retryAfterSeconds ?? []);
    return delays.length > 0
      ? { scope: 'minute', retryAfterSeconds: Math.min(...delays) }
      : { scope: 'minute' };
  }
  return quotas.length > 0 && quotas.every((quota) => quota.scope === 'day')
    ? { scope: 'day' }
    : undefined;
}
