import { describe, expect, it } from 'vitest';
import { parseFirebaseConfig } from './env.ts';

const env = {
  VITE_FIREBASE_API_KEY: 'key',
  VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'example',
  VITE_FIREBASE_APP_ID: '1:2:web:3',
  MODE: 'test',
};

describe('parseFirebaseConfig', () => {
  it('maps environment variables to the Firebase web config', () => {
    expect(parseFirebaseConfig(env)).toEqual({
      apiKey: 'key',
      authDomain: 'example.firebaseapp.com',
      projectId: 'example',
      appId: '1:2:web:3',
    });
  });

  it('names the missing variables in the error', () => {
    const { VITE_FIREBASE_APP_ID, ...incomplete } = env;
    expect(() => parseFirebaseConfig({ ...incomplete, VITE_FIREBASE_API_KEY: '' })).toThrow(
      /VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID/,
    );
  });
});
