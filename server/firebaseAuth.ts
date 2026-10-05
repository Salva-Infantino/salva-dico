import {
  createRemoteJWKSet,
  decodeJwt,
  errors,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';

/**
 * Google's public keys for Firebase ID tokens, as a JSON Web Key Set. `jose` caches
 * them and refetches on an unknown key id (Google rotates them every few hours).
 */
const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/** Tolerated clock difference between Google and the function, in seconds. */
const CLOCK_TOLERANCE_S = 5;

export class InvalidIdTokenError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InvalidIdTokenError';
  }
}

export interface IdTokenVerifierOptions {
  projectId: string;
  /**
   * Local Auth emulator: its tokens are unsigned, so only the claims are checked.
   * `parseServerEnv` only allows it with a `demo-` project, which exists in the
   * emulators only.
   */
  emulator?: boolean;
  /** Signing keys (tests use a local key set). Defaults to Google's published keys. */
  keys?: JWTVerifyGetKey;
}

/**
 * Verifies a Firebase ID token as documented for third-party JWT libraries
 * (https://firebase.google.com/docs/auth/admin/verify-id-tokens): RS256 signature by
 * one of Google's keys, audience = project id, issuer = securetoken URL of the project,
 * expiry and issue time, authentication time in the past, non-empty subject (the uid).
 *
 * This replaces firebase-admin, whose transitive dependencies failed to load on the
 * Netlify functions runtime, and which is much heavier than needed here.
 */
export function createIdTokenVerifier({
  projectId,
  emulator = false,
  keys,
}: IdTokenVerifierOptions) {
  const issuer = `https://securetoken.google.com/${projectId}`;
  const getKey = keys ?? createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

  return async (token: string): Promise<{ uid: string }> => {
    let payload: JWTPayload;
    try {
      if (emulator) {
        payload = decodeJwt(token);
      } else {
        ({ payload } = await jwtVerify(token, getKey, {
          algorithms: ['RS256'],
          audience: projectId,
          issuer,
          requiredClaims: ['exp', 'iat', 'sub', 'auth_time'],
          clockTolerance: CLOCK_TOLERANCE_S,
        }));
      }
    } catch (error) {
      if (error instanceof errors.JOSEError) {
        throw new InvalidIdTokenError(`Invalid ID token: ${error.code}`, { cause: error });
      }
      throw error;
    }
    return { uid: checkClaims(payload, { projectId, issuer }) };
  };
}

/**
 * Claim checks shared by both modes (some repeat what jwtVerify already checked, which
 * keeps the emulator mode, without a signature, held to the same rules).
 */
function checkClaims(
  payload: JWTPayload,
  { projectId, issuer }: { projectId: string; issuer: string },
): string {
  const now = Math.floor(Date.now() / 1000);
  const authTime = payload.auth_time;
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const problems = [
    payload.iss !== issuer && 'issuer',
    !audiences.includes(projectId) && 'audience',
    (typeof payload.exp !== 'number' || payload.exp + CLOCK_TOLERANCE_S <= now) && 'expired',
    (typeof payload.iat !== 'number' || payload.iat - CLOCK_TOLERANCE_S > now) &&
      'issued in the future',
    (typeof authTime !== 'number' || authTime - CLOCK_TOLERANCE_S > now) && 'auth_time',
    (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) &&
      'subject',
  ].filter(Boolean);
  if (problems.length > 0 || typeof payload.sub !== 'string') {
    throw new InvalidIdTokenError(`Invalid ID token: ${problems.join(', ')}`);
  }
  return payload.sub;
}
