// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_GEMINI_MODEL, parseServerEnv } from './env.ts';

const env = { GEMINI_API_KEY: 'key', OWNER_UID: 'owner', VITE_FIREBASE_PROJECT_ID: 'salva-dico' };

describe('parseServerEnv', () => {
  it('uses the default model and the client project id', () => {
    expect(parseServerEnv(env)).toEqual({
      geminiApiKey: 'key',
      geminiModel: DEFAULT_GEMINI_MODEL,
      ownerUid: 'owner',
      projectId: 'salva-dico',
    });
  });

  it('lets FIREBASE_PROJECT_ID and GEMINI_MODEL override the defaults', () => {
    const parsed = parseServerEnv({ ...env, FIREBASE_PROJECT_ID: 'other', GEMINI_MODEL: 'x' });
    expect(parsed).toMatchObject({ projectId: 'other', geminiModel: 'x' });
  });

  it('names missing variables without echoing secrets', () => {
    expect(() => parseServerEnv({ OWNER_UID: 'owner' })).toThrow(/GEMINI_API_KEY/);
    expect(() => parseServerEnv({ GEMINI_API_KEY: 'key', OWNER_UID: 'o' })).toThrow(
      /FIREBASE_PROJECT_ID/,
    );
    expect(() => parseServerEnv({ ...env, OWNER_UID: '' })).not.toThrow(/key/);
  });
});
