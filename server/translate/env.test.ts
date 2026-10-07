// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseServerEnv } from './env.ts';

const env = { GEMINI_API_KEY: 'key', OWNER_UID: 'owner', VITE_FIREBASE_PROJECT_ID: 'salva-dico' };

describe('parseServerEnv', () => {
  it('uses the default model and the client project id', () => {
    expect(parseServerEnv(env)).toEqual({
      geminiApiKey: 'key',
      geminiModels: [
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
      ],
      ownerUid: 'owner',
      projectId: 'salva-dico',
      authEmulator: false,
    });
  });

  it('lets FIREBASE_PROJECT_ID and GEMINI_MODEL (a list) override the defaults', () => {
    const parsed = parseServerEnv({
      ...env,
      FIREBASE_PROJECT_ID: 'other',
      GEMINI_MODEL: ' model-a , model-b,',
    });
    expect(parsed).toMatchObject({ projectId: 'other', geminiModels: ['model-a', 'model-b'] });
  });

  it('rejects a GEMINI_MODEL list without any model', () => {
    expect(() => parseServerEnv({ ...env, GEMINI_MODEL: ' , ' })).toThrow(/GEMINI_MODEL/);
  });

  it('refuses the Auth emulator host with a real project (token signatures unchecked)', () => {
    expect(() => parseServerEnv({ ...env, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' })).toThrow(
      /FIREBASE_AUTH_EMULATOR_HOST/,
    );
    expect(
      parseServerEnv({
        ...env,
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
        VITE_FIREBASE_PROJECT_ID: 'demo-salva-dico',
      }).projectId,
    ).toBe('demo-salva-dico');
  });

  it('names missing variables without echoing secrets', () => {
    expect(() => parseServerEnv({ OWNER_UID: 'owner' })).toThrow(/GEMINI_API_KEY/);
    expect(() => parseServerEnv({ GEMINI_API_KEY: 'key', OWNER_UID: 'o' })).toThrow(
      /FIREBASE_PROJECT_ID/,
    );
    expect(() => parseServerEnv({ ...env, OWNER_UID: '' })).not.toThrow(/key/);
  });
});
