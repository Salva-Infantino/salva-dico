import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fr } from '../i18n/fr.ts';
import { NotificationsProvider } from './notifications/NotificationsProvider.tsx';
import { UpdatePrompt } from './UpdatePrompt.tsx';

const setNeedRefresh = vi.fn();
const setOfflineReady = vi.fn();
const updateServiceWorker = vi.fn(() => Promise.resolve());
const swState = { needRefresh: false, offlineReady: false };

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [swState.needRefresh, setNeedRefresh],
    offlineReady: [swState.offlineReady, setOfflineReady],
    updateServiceWorker,
  }),
}));

function renderPrompt() {
  return render(
    <NotificationsProvider>
      <UpdatePrompt />
    </NotificationsProvider>,
  );
}

describe('UpdatePrompt', () => {
  beforeEach(() => {
    swState.needRefresh = false;
    swState.offlineReady = false;
  });

  it('shows nothing when there is no update and the app is not newly offline-ready', () => {
    renderPrompt();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces once that the app works offline', () => {
    swState.offlineReady = true;
    renderPrompt();
    expect(screen.getByRole('status')).toHaveTextContent(fr.pwa.offlineReady);
    expect(setOfflineReady).toHaveBeenCalledWith(false);
  });

  it('offers to reload when a new version is waiting, until dismissed', async () => {
    swState.needRefresh = true;
    renderPrompt();

    expect(screen.getByRole('status')).toHaveTextContent(fr.pwa.updateAvailable);
    await userEvent.click(screen.getByRole('button', { name: fr.pwa.reload }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);

    await userEvent.click(screen.getByRole('button', { name: fr.notifications.close }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
