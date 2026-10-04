import { useRegisterSW } from 'virtual:pwa-register/react';
import { fr } from '../i18n/fr.ts';

/**
 * Shows a non-blocking banner when a new service worker is waiting, so the user
 * chooses when to reload (never in the middle of editing an entry).
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) {
    return null;
  }

  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div className="toast" role="status">
      <span>{needRefresh ? fr.pwa.updateAvailable : fr.pwa.offlineReady}</span>
      {needRefresh && (
        <button type="button" onClick={() => void updateServiceWorker(true)}>
          {fr.pwa.reload}
        </button>
      )}
      <button type="button" className="secondary" onClick={close}>
        {fr.pwa.dismiss}
      </button>
    </div>
  );
}
