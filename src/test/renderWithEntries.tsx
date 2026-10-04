import { render } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router';
import { vi } from 'vitest';
import { NotificationsProvider } from '../components/notifications/NotificationsProvider.tsx';
import { EntriesContext } from '../data/EntriesContext.ts';
import { EntryActionsContext, type EntryActions } from '../data/EntryActionsContext.ts';
import type { Entry } from '../domain/schemas.ts';
import { pageRoutes } from '../routes.tsx';

/** Exposes the current URL to assertions. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

/**
 * Renders the app pages with the given entries already synced (no auth, no Firebase).
 * Write actions are mocks returned for assertions.
 */
export function renderWithEntries(entries: Entry[], path = '/') {
  const actions = {
    create: vi.fn<EntryActions['create']>(() => 'new-id'),
    update: vi.fn<EntryActions['update']>(),
    remove: vi.fn<EntryActions['remove']>(),
    setMastered: vi.fn<EntryActions['setMastered']>(),
  };
  const router = createMemoryRouter(
    [
      {
        element: (
          <NotificationsProvider>
            <EntriesContext value={{ status: 'ready', entries, syncFailed: false }}>
              <EntryActionsContext value={actions}>
                <Outlet />
                <LocationProbe />
              </EntryActionsContext>
            </EntriesContext>
          </NotificationsProvider>
        ),
        children: pageRoutes,
      },
    ],
    { initialEntries: [path] },
  );
  return { router, actions, ...render(<RouterProvider router={router} />) };
}
