import { createContext, useContext } from 'react';

export interface SignedInUser {
  uid: string;
  email: string | null;
}

export type SignInError = 'offline' | 'failed';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; error: SignInError | null }
  | { status: 'signedIn'; user: SignedInUser };

export interface AuthContextValue {
  state: AuthState;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Only with the local emulators: signs in as the seeded owner account. */
  signInWithEmulatorOwner?: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
