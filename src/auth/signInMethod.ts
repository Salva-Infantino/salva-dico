export type SignInMethod = 'redirect' | 'popup';

/**
 * Redirect sign-in only works reliably when the auth helper is served from the
 * app's own origin: browsers now partition third-party storage. In production,
 * Netlify proxies /__/auth/* to Firebase and authDomain is the app's host.
 * Elsewhere (localhost), the popup flow is used.
 */
export function chooseSignInMethod(authDomain: string, currentHost: string): SignInMethod {
  return authDomain === currentHost ? 'redirect' : 'popup';
}
