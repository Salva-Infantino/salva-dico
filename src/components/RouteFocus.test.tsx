import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useRef } from 'react';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { RouteFocus } from './RouteFocus.tsx';

function FocusedFieldPage() {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  return (
    <main>
      <h1>Éditeur</h1>
      <input ref={input} aria-label="Champ" />
    </main>
  );
}

function renderRoutes() {
  const router = createMemoryRouter([
    {
      element: (
        <>
          <Outlet />
          <RouteFocus />
        </>
      ),
      children: [
        {
          index: true,
          element: (
            <main>
              <h1>Accueil</h1>
              <Link to="/settings">Réglages</Link>
              <Link to="/editor">Éditeur</Link>
            </main>
          ),
        },
        {
          path: 'settings',
          element: (
            <main>
              <h1>Réglages</h1>
            </main>
          ),
        },
        { path: 'editor', element: <FocusedFieldPage /> },
      ],
    },
  ]);
  render(<RouterProvider router={router} />);
}

describe('RouteFocus', () => {
  it('names the tab after the page heading', async () => {
    renderRoutes();
    expect(document.title).toBe('Accueil · Salva Dico');
    await userEvent.click(screen.getByRole('link', { name: 'Réglages' }));
    expect(document.title).toBe('Réglages · Salva Dico');
  });

  it('moves the focus to the new heading, not on the first page load', async () => {
    renderRoutes();
    expect(document.body).toHaveFocus();
    await userEvent.click(screen.getByRole('link', { name: 'Réglages' }));
    expect(screen.getByRole('heading', { name: 'Réglages' })).toHaveFocus();
  });

  it('keeps the focus a page placed itself', async () => {
    renderRoutes();
    await userEvent.click(screen.getByRole('link', { name: 'Éditeur' }));
    expect(screen.getByRole('textbox', { name: 'Champ' })).toHaveFocus();
  });
});
