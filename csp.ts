/**
 * Content-Security-Policy of the app document, injected as a <meta> tag at build
 * time only (Vite's dev server relies on inline scripts).
 *
 * It is a <meta> tag rather than a Netlify header so it does not apply to the
 * Firebase auth helper pages proxied under /__/auth/, which have their own needs.
 */
import { EMULATOR_HOSTS } from './src/config/emulator.ts';

export interface CspOptions {
  authDomain: string;
  /** Build for the local emulators (E2E tests): also allow connections to them. */
  useEmulators: boolean;
}

export function contentSecurityPolicy({ authDomain, useEmulators }: CspOptions): string {
  const { host, port } = EMULATOR_HOSTS.auth;
  const authEmulatorOrigin = `http://${host}:${String(port)}`;
  const emulatorOrigins = useEmulators
    ? Object.values(EMULATOR_HOSTS).map(({ host, port }) => `http://${host}:${String(port)}`)
    : [];
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
      ...emulatorOrigins,
    ].join(' '),
    // Auth helper iframe: same origin in production (proxied), Firebase domain elsewhere.
    [
      `frame-src 'self' https://${authDomain}`,
      // The Auth emulator serves its own helper iframe.
      ...(useEmulators ? [authEmulatorOrigin] : []),
    ].join(' '),
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
