import { describe, expect, it } from 'vitest';
import { chooseSignInMethod } from './signInMethod.ts';

describe('chooseSignInMethod', () => {
  it('uses a redirect when the auth helper is proxied on the app origin', () => {
    expect(chooseSignInMethod('salva-dico.netlify.app', 'salva-dico.netlify.app')).toBe('redirect');
  });

  it('uses a popup when the auth domain is another origin', () => {
    expect(chooseSignInMethod('salva-dico.firebaseapp.com', 'localhost:5173')).toBe('popup');
  });
});
