// @vitest-environment node
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  UnsecuredJWT,
  type JWTPayload,
} from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { createIdTokenVerifier, InvalidIdTokenError } from './firebaseAuth.ts';

const PROJECT = 'salva-dico';
const ISSUER = `https://securetoken.google.com/${PROJECT}`;
const now = () => Math.floor(Date.now() / 1000);

type KeyPair = Awaited<ReturnType<typeof generateKeyPair>>;
let google: KeyPair;
let attacker: KeyPair;
let verify: ReturnType<typeof createIdTokenVerifier>;

beforeAll(async () => {
  google = await generateKeyPair('RS256');
  attacker = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(google.publicKey)), kid: 'google-key', alg: 'RS256' };
  verify = createIdTokenVerifier({ projectId: PROJECT, keys: createLocalJWKSet({ keys: [jwk] }) });
});

/**
 * Claims of a token as Firebase Auth issues it, with overrides. Built as one object:
 * the SignJWT setters would overwrite the invalid values a test wants to send.
 */
function claimsWith(overrides: JWTPayload): JWTPayload {
  const t = now();
  return {
    iss: ISSUER,
    aud: PROJECT,
    sub: 'owner-uid',
    iat: t - 60,
    exp: t + 3600,
    auth_time: t - 60,
    ...overrides,
  };
}

/** The same claims without one of them. */
function claimsWithout(name: 'sub' | 'auth_time'): JWTPayload {
  const { [name]: _omitted, ...rest } = claimsWith({});
  return rest;
}

function sign(payload: JWTPayload, key: KeyPair = google, kid = 'google-key') {
  return new SignJWT(payload).setProtectedHeader({ alg: 'RS256', kid }).sign(key.privateKey);
}

function token(overrides: JWTPayload = {}, key: KeyPair = google, kid = 'google-key') {
  return sign(claimsWith(overrides), key, kid);
}

async function rejects(promise: Promise<unknown>) {
  await expect(promise).rejects.toBeInstanceOf(InvalidIdTokenError);
}

describe('createIdTokenVerifier', () => {
  it('returns the uid of a valid token', async () => {
    await expect(verify(await token())).resolves.toEqual({ uid: 'owner-uid' });
  });

  it('rejects a token signed by another key', async () => {
    await rejects(verify(await token({}, attacker)));
    await rejects(verify(await token({}, attacker, 'unknown-key')));
  });

  it('rejects another project (audience or issuer)', async () => {
    await rejects(verify(await token({ aud: 'other-project' })));
    await rejects(verify(await token({ iss: 'https://securetoken.google.com/other-project' })));
  });

  it('rejects expired tokens and tokens from the future', async () => {
    await rejects(verify(await token({ exp: now() - 60 })));
    await rejects(verify(await token({ iat: now() + 3600 })));
    await rejects(verify(await token({ auth_time: now() + 3600 })));
  });

  it('rejects a missing or empty subject and a missing auth_time', async () => {
    await rejects(verify(await token({ sub: '' })));
    await rejects(verify(await sign(claimsWithout('sub'))));
    await rejects(verify(await sign(claimsWithout('auth_time'))));
  });

  it('rejects unsigned tokens and garbage', async () => {
    await rejects(verify(new UnsecuredJWT(claimsWith({})).encode()));
    await rejects(verify('not-a-jwt'));
  });

  describe('Auth emulator mode', () => {
    const emulator = createIdTokenVerifier({ projectId: PROJECT, emulator: true });
    const unsigned = (claims: JWTPayload = {}) => new UnsecuredJWT(claimsWith(claims)).encode();

    it('accepts the unsigned tokens of the emulator', async () => {
      await expect(emulator(unsigned())).resolves.toEqual({ uid: 'owner-uid' });
    });

    it('still checks the claims', async () => {
      await rejects(emulator(unsigned({ aud: 'other-project' })));
      await rejects(emulator(unsigned({ exp: now() - 60 })));
      await rejects(emulator(unsigned({ iss: 'https://securetoken.google.com/other-project' })));
      await rejects(emulator(unsigned({ sub: '' })));
    });
  });
});
