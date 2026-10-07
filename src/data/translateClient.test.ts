import { describe, expect, it, vi } from 'vitest';
import { garconContent } from '../test/fixtures.ts';
import { requestTranslation } from './translateClient.ts';

const request = { sourceLang: 'fr', text: 'garçon' } as const;
const signal = () => new AbortController().signal;

function deps(response: Response | Error) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  return { fetch: fetchMock, getIdToken: () => Promise.resolve('id-token') };
}

describe('requestTranslation', () => {
  it('sends the request with the ID token and returns the validated content', async () => {
    const d = deps(Response.json({ content: garconContent }));
    expect(await requestTranslation(d, request, signal())).toEqual({
      ok: true,
      content: garconContent,
    });
    const [url, init] = d.fetch.mock.calls[0] ?? [];
    expect(url).toBe('/api/translate');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer id-token');
    expect(JSON.parse(init?.body as string)).toEqual(request);
  });

  it('returns the error code of the function', async () => {
    const d = deps(Response.json({ error: 'quota' }, { status: 429 }));
    expect(await requestTranslation(d, request, signal())).toEqual({ ok: false, error: 'quota' });
  });

  it('passes on which quota was hit', async () => {
    const quota = { scope: 'minute', retryAfterSeconds: 36 } as const;
    const d = deps(Response.json({ error: 'quota', quota }, { status: 429 }));
    expect(await requestTranslation(d, request, signal())).toEqual({
      ok: false,
      error: 'quota',
      quota,
    });
  });

  it('reports a network failure', async () => {
    expect(await requestTranslation(deps(new TypeError('offline')), request, signal())).toEqual({
      ok: false,
      error: 'network',
    });
  });

  it('reports a cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    const d = deps(new Error('aborted'));
    expect(await requestTranslation(d, request, controller.signal)).toEqual({
      ok: false,
      error: 'cancelled',
    });
  });

  it('rejects content that does not match the schema', async () => {
    const broken = { ...garconContent, translations: { ...garconContent.translations, it: [] } };
    expect(
      await requestTranslation(deps(Response.json({ content: broken })), request, signal()),
    ).toEqual({ ok: false, error: 'invalid_output' });
  });

  it('handles a non-JSON error page', async () => {
    const d = deps(new Response('<html>Bad gateway</html>', { status: 502 }));
    expect(await requestTranslation(d, request, signal())).toEqual({
      ok: false,
      error: 'ai_unavailable',
    });
  });
});
