import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { fr } from '../i18n/fr.ts';
import { AppShell } from './AppShell.tsx';

const user = { uid: 'owner', email: 'salva@example.com', name: 'Salva Infantino' };

function renderShell(path: string) {
  const page = (title: string) => (
    <AppShell user={user}>
      <h1>{title}</h1>
    </AppShell>
  );
  const router = createMemoryRouter(
    [
      { path: '/', element: page('Dico') },
      { path: '/quiz', element: page('Quiz page') },
      { path: '/settings', element: page('Settings page') },
      { path: '/entries/:id', element: page('Entry page') },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
}

describe('AppShell', () => {
  it('shows the tab bar on top-level pages and navigates with it', async () => {
    renderShell('/');
    const tabs = screen.getAllByRole('navigation', { name: fr.nav.label })[1];
    if (!tabs) throw new Error('Tab bar missing');
    expect(within(tabs).getByRole('link', { name: fr.nav.dictionaryShort })).toHaveClass('active');

    await userEvent.click(within(tabs).getByRole('link', { name: fr.nav.quiz }));
    expect(screen.getByRole('heading', { name: 'Quiz page' })).toBeInTheDocument();
    await userEvent.click(
      within(screen.getAllByRole('navigation')[1] ?? tabs).getByRole('link', {
        name: fr.nav.settings,
      }),
    );
    expect(screen.getByRole('heading', { name: 'Settings page' })).toBeInTheDocument();
  });

  it('hides the tab bar on full-screen pages', () => {
    renderShell('/entries/x');
    // Only the sidebar navigation remains (hidden by CSS on phones).
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
  });

  it('shows the account with the first name and the sync state', () => {
    renderShell('/');
    const account = screen.getByRole('link', { name: fr.nav.account });
    expect(account).toHaveAttribute('href', '/settings');
    expect(account).toHaveTextContent('S');
    expect(account).toHaveTextContent('Salva');
    expect(account).toHaveTextContent(fr.nav.synced);
  });

  it('starts a new entry in the language shown in the dictionary', () => {
    renderShell('/?lang=es');
    expect(screen.getByRole('link', { name: fr.nav.newEntry })).toHaveAttribute(
      'href',
      '/entries/new?lang=es',
    );
  });
});
