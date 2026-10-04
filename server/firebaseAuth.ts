import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const APP_NAME = 'translate';

/**
 * Verifies Firebase ID tokens. Only the project id is needed: the Admin SDK checks
 * the signature against Google's public keys, so no service account secret is stored.
 * With FIREBASE_AUTH_EMULATOR_HOST set, it accepts Auth emulator tokens instead.
 */
export function createIdTokenVerifier(projectId: string) {
  const app = getApps().find((a) => a.name === APP_NAME) ?? initializeApp({ projectId }, APP_NAME);
  const auth = getAuth(app);
  return async (token: string) => {
    const decoded = await auth.verifyIdToken(token);
    return { uid: decoded.uid };
  };
}
