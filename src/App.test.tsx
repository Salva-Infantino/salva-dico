import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';
import { fr } from './i18n/fr.ts';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('renders the dictionary home page at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: fr.home.title })).toBeInTheDocument();
  });

  it('renders a not-found page with a link home for unknown routes', () => {
    renderAt('/does-not-exist');
    expect(screen.getByRole('heading', { level: 1, name: fr.notFound.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: fr.notFound.backHome })).toHaveAttribute('href', '/');
  });
});
