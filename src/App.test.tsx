import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FirebaseError } from 'firebase/app';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';
import { AuthContext, type AuthContextValue, type AuthState } from './auth/AuthContext.ts';
import type { EntriesSyncOptions } from './data/entriesSync.ts';
import type { Entry } from './domain/schemas.ts';
import { fr } from './i18n/fr.ts';
import { arbreContent, garconContent, makeEntry } from './test/fixtures.ts';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

vi.mock('./data/firebase.ts', () => ({
  getFirebase: () => ({ db: {} }),
  requestPersistentStorage: () => Promise.resolve(true),
}));

/** Captures the sync callbacks so each test can drive the sync. */
let sync: EntriesSyncOptions | null = null;
vi.mock('./data/entriesSync.ts', () => ({
  startEntriesSync: (options: EntriesSyncOptions) => {
    sync = options;
    return () => undefined;
  },
}));

const signIn = vi.fn(() => Promise.resolve());
const signOut = vi.fn(() => Promise.resolve());
const OWNER = { uid: 'owner-uid', email: 'salva@example.com' };

function renderApp(state: AuthState, path = '/') {
  const auth: AuthContextValue = { state, signIn, signOut };
  return render(
    <AuthContext value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AuthContext>,
  );
}

function emitEntries(entries: Entry[]) {
  sync?.onEntries(new Map(entries.map((entry) => [entry.id, entry])));
}

beforeEach(() => {
  sync = null;
});

describe('App', () => {
  it('shows a loading screen while the session is restored', () => {
    renderApp({ status: 'loading' });
    expect(screen.getByText(fr.common.loading)).toBeInTheDocument();
  });

  it('asks to sign in when signed out', async () => {
    renderApp({ status: 'signedOut', error: null });
    await userEvent.click(screen.getByRole('button', { name: fr.auth.signIn }));
    expect(signIn).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains a sign-in failure while offline', () => {
    renderApp({ status: 'signedOut', error: 'offline' });
    expect(screen.getByRole('alert')).toHaveTextContent(fr.auth.errorOffline);
  });

  it('loads entries for the signed-in user and ignores deleted ones', async () => {
    renderApp({ status: 'signedIn', user: OWNER });
    expect(screen.getByText(fr.common.loading)).toBeInTheDocument();
    expect(sync?.uid).toBe(OWNER.uid);

    emitEntries([
      makeEntry(garconContent, { id: 'a' }),
      makeEntry(arbreContent, { id: 'b', deleted: true }),
    ]);

    expect(
      await screen.findByRole('heading', { level: 1, name: fr.home.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(fr.home.entryCount(1))).toBeInTheDocument();
  });

  it('shows the account id and a sign-out button when the rules deny access', async () => {
    renderApp({ status: 'signedIn', user: OWNER });
    sync?.onError?.(new FirebaseError('permission-denied', 'Missing or insufficient permissions.'));

    expect(await screen.findByRole('heading', { name: fr.auth.deniedTitle })).toBeInTheDocument();
    expect(screen.getByText(OWNER.uid)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: fr.auth.signOut }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('keeps local entries usable when the sync fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderApp({ status: 'signedIn', user: OWNER });
    emitEntries([makeEntry(garconContent, { id: 'a' })]);
    sync?.onError?.(new FirebaseError('unavailable', 'Backend unavailable'));

    expect(await screen.findByText(fr.sync.failed)).toBeInTheDocument();
    expect(screen.getByText(fr.home.entryCount(1))).toBeInTheDocument();
  });

  it('renders a not-found page for unknown routes', async () => {
    renderApp({ status: 'signedIn', user: OWNER }, '/does-not-exist');
    emitEntries([]);
    expect(
      await screen.findByRole('heading', { level: 1, name: fr.notFound.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: fr.notFound.backHome })).toHaveAttribute('href', '/');
  });
});
