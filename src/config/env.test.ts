import { describe, expect, it } from 'vitest';
import { parseClientEnv } from './env.ts';

const env = {
  VITE_FIREBASE_API_KEY: 'key',
  VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'example',
  VITE_FIREBASE_APP_ID: '1:2:web:3',
  MODE: 'test',
};

describe('parseClientEnv', () => {
  it('maps environment variables to the Firebase web config', () => {
    expect(parseClientEnv(env)).toEqual({
      firebase: {
        apiKey: 'key',
        authDomain: 'example.firebaseapp.com',
        projectId: 'example',
        appId: '1:2:web:3',
      },
      useEmulators: false,
    });
  });

  it('enables the emulators only with VITE_USE_EMULATORS=true', () => {
    expect(parseClientEnv({ ...env, VITE_USE_EMULATORS: 'true' }).useEmulators).toBe(true);
    expect(parseClientEnv({ ...env, VITE_USE_EMULATORS: 'false' }).useEmulators).toBe(false);
    expect(() => parseClientEnv({ ...env, VITE_USE_EMULATORS: 'yes' })).toThrow(
      /VITE_USE_EMULATORS/,
    );
  });

  it('names the missing variables in the error', () => {
    const { VITE_FIREBASE_APP_ID, ...incomplete } = env;
    expect(() => parseClientEnv({ ...incomplete, VITE_FIREBASE_API_KEY: '' })).toThrow(
      /VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID/,
    );
  });
});
