import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { fr } from '../i18n/fr.ts';
import { useNotify } from './notifications/NotificationsContext.ts';

/**
 * Service worker lifecycle messages, shown as notifications at the top of the
 * screen so they never cover the add button or the form's save button:
 * - "ready offline" once, briefly;
 * - "new version" until the user reloads or dismisses it, so an update never
 *   interrupts an edit in progress.
 */
export function UpdatePrompt() {
  const notify = useNotify();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!offlineReady) return;
    notify(fr.pwa.offlineReady);
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, notify]);

  useEffect(() => {
    if (!needRefresh) return;
    notify(fr.pwa.updateAvailable, 'success', {
      persistent: true,
      action: {
        label: fr.pwa.reload,
        onClick: () => void updateServiceWorker(true),
      },
    });
    setNeedRefresh(false);
  }, [needRefresh, setNeedRefresh, notify, updateServiceWorker]);

  return null;
}
