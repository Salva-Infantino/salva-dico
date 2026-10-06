import type { SignedInUser } from './AuthContext.ts';

/** First letter of the name (or e-mail) for the avatar. */
export function userInitial(user: SignedInUser): string {
  return (user.name ?? user.email ?? '').trim().charAt(0).toUpperCase() || '?';
}
