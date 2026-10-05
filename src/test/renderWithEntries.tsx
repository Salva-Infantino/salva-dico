import { render } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router';
import { vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth/AuthContext.ts';
import { NotificationsProvider } from '../components/notifications/NotificationsProvider.tsx';
import { EntriesContext } from '../data/EntriesContext.ts';
import { EntryActionsContext, type EntryActions } from '../data/EntryActionsContext.ts';
import type { TranslateResult } from '../data/translateClient.ts';
import { TranslatorContext, type Translate } from '../data/TranslatorContext.ts';
import type { Entry } from '../domain/schemas.ts';
import { pageRoutes } from '../routes.tsx';

/** Exposes the current URL to assertions. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

/**
 * Renders the app pages with the given entries already synced (no Firebase), signed in
 * as the owner. Write actions, sign-out and the AI translator are mocks returned for
 * assertions.
 */
export function renderWithEntries(
  entries: Entry[],
  path = '/',
  translateResult: TranslateResult = { ok: false, error: 'ai_unavailable' },
) {
  const translate = vi.fn<Translate>(() => Promise.resolve(translateResult));
  const actions = {
    create: vi.fn<EntryActions['create']>(() => 'new-id'),
    update: vi.fn<EntryActions['update']>(),
    remove: vi.fn<EntryActions['remove']>(),
    setMastered: vi.fn<EntryActions['setMastered']>(),
    importEntries: vi.fn<EntryActions['importEntries']>(),
  };
  const auth = {
    state: { status: 'signedIn', user: { uid: 'owner', email: 'owner@example.com' } },
    signIn: vi.fn<AuthContextValue['signIn']>(() => Promise.resolve()),
    signOut: vi.fn<AuthContextValue['signOut']>(() => Promise.resolve()),
  } satisfies AuthContextValue;
  const router = createMemoryRouter(
    [
      {
        element: (
          <AuthContext value={auth}>
            <NotificationsProvider>
              <EntriesContext value={{ status: 'ready', entries, syncFailed: false }}>
                <EntryActionsContext value={actions}>
                  <TranslatorContext value={translate}>
                    <Outlet />
                    <LocationProbe />
                  </TranslatorContext>
                </EntryActionsContext>
              </EntriesContext>
            </NotificationsProvider>
          </AuthContext>
        ),
        children: pageRoutes,
      },
    ],
    { initialEntries: [path] },
  );
  return { router, actions, auth, translate, ...render(<RouterProvider router={router} />) };
}
