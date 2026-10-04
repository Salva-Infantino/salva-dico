/**
 * Content-Security-Policy of the app document, injected as a <meta> tag at build
 * time only (Vite's dev server relies on inline scripts).
 *
 * It is a <meta> tag rather than a Netlify header so it does not apply to the
 * Firebase auth helper pages proxied under /__/auth/, which have their own needs.
 */
export function contentSecurityPolicy(authDomain: string): string {
  return [
    "default-src 'self'",
    // Firebase Auth loads the Google API client for the sign-in flows.
    "script-src 'self' https://apis.google.com",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    [
      "connect-src 'self'",
      'https://firestore.googleapis.com',
      'https://identitytoolkit.googleapis.com',
      'https://securetoken.googleapis.com',
    ].join(' '),
    // Auth helper iframe: same origin in production (proxied), Firebase domain elsewhere.
    `frame-src 'self' https://${authDomain}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
