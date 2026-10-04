import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fr } from '../i18n/fr.ts';
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

describe('UpdatePrompt', () => {
  beforeEach(() => {
    swState.needRefresh = false;
    swState.offlineReady = false;
  });

  it('renders nothing when there is no update and the app is not newly offline-ready', () => {
    const { container } = render(<UpdatePrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers to reload when a new version is waiting', async () => {
    swState.needRefresh = true;
    render(<UpdatePrompt />);

    expect(screen.getByRole('status')).toHaveTextContent(fr.pwa.updateAvailable);
    await userEvent.click(screen.getByRole('button', { name: fr.pwa.reload }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('can be dismissed', async () => {
    swState.offlineReady = true;
    render(<UpdatePrompt />);

    expect(screen.queryByRole('button', { name: fr.pwa.reload })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: fr.pwa.dismiss }));
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    expect(setOfflineReady).toHaveBeenCalledWith(false);
  });
});
