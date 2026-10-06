import { FirebaseError } from 'firebase/app';
import {
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EMULATOR_OWNER } from '../config/emulator.ts';
import { getFirebase } from '../data/firebase.ts';
import { AuthContext, type AuthState, type SignInError } from './AuthContext.ts';
import { chooseSignInMethod } from './signInMethod.ts';

/** Errors that only mean "the user closed the sign-in window": not shown. */
const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

function toSignInError(error: unknown): SignInError | null {
  if (error instanceof FirebaseError && CANCELLED.has(error.code)) return null;
  if (!navigator.onLine) return 'offline';
  if (error instanceof FirebaseError && error.code === 'auth/network-request-failed')
    return 'offline';
  console.error('Sign-in failed', error);
  return 'failed';
}

/**
 * Emulator-only sign-in. The condition is replaced at build time, so this code and
 * the emulator credentials are removed from production bundles.
 */
const signInWithEmulatorOwner =
  import.meta.env.VITE_USE_EMULATORS === 'true'
    ? async () => {
        await signInWithEmailAndPassword(
          getFirebase().auth,
          EMULATOR_OWNER.email,
          EMULATOR_OWNER.password,
        );
      }
    : undefined;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    const { auth } = getFirebase();
    // Surfaces errors of a redirect sign-in that just came back to the app.
    getRedirectResult(auth).catch((error: unknown) => {
      setState({ status: 'signedOut', error: toSignInError(error) });
    });
    // The session is persisted (IndexedDB): this resolves offline too.
    return onAuthStateChanged(auth, (user) => {
      setState(
        user
          ? {
              status: 'signedIn',
              user: { uid: user.uid, email: user.email, name: user.displayName },
            }
          : (previous) => ({
              status: 'signedOut',
              error: previous.status === 'signedOut' ? previous.error : null,
            }),
      );
    });
  }, []);

  const signIn = useCallback(async () => {
    const { auth, config } = getFirebase();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      if (chooseSignInMethod(config.authDomain, window.location.host) === 'redirect') {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      setState({ status: 'signedOut', error: toSignInError(error) });
    }
  }, []);

  const signOut = useCallback(() => firebaseSignOut(getFirebase().auth), []);

  const value = useMemo(
    () => ({
      state,
      signIn,
      signOut,
      ...(signInWithEmulatorOwner && {
        signInWithEmulatorOwner: () =>
          signInWithEmulatorOwner().catch((error: unknown) => {
            setState({ status: 'signedOut', error: toSignInError(error) });
          }),
      }),
    }),
    [state, signIn, signOut],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}
