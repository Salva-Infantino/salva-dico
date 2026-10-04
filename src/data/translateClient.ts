import type { EntryContent } from '../domain/schemas.ts';
import {
  TRANSLATE_PATH,
  translateResponseSchema,
  type TranslateErrorCode,
  type TranslateRequest,
} from '../domain/translateApi.ts';

export type TranslateFailure = TranslateErrorCode | 'network' | 'cancelled';

export type TranslateResult =
  { ok: true; content: EntryContent } | { ok: false; error: TranslateFailure };

export interface TranslateClientDeps {
  fetch: typeof fetch;
  /** Fresh Firebase ID token of the signed-in user. */
  getIdToken: () => Promise<string>;
}

/** Calls POST /api/translate and validates the answer with the shared schema. */
export async function requestTranslation(
  deps: TranslateClientDeps,
  request: TranslateRequest,
  signal: AbortSignal,
): Promise<TranslateResult> {
  let response: Response;
  try {
    const token = await deps.getIdToken();
    response = await deps.fetch(TRANSLATE_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(request),
      signal,
    });
  } catch {
    return { ok: false, error: signal.aborted ? 'cancelled' : 'network' };
  }

  const body = translateResponseSchema.safeParse(await response.json().catch(() => null));
  if (!body.success) {
    // Not our function's JSON (proxy error page, function crash…).
    return { ok: false, error: response.ok ? 'invalid_output' : 'ai_unavailable' };
  }
  return 'content' in body.data
    ? { ok: true, content: body.data.content }
    : { ok: false, error: body.data.error };
}
