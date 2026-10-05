import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { fr } from '../../i18n/fr.ts';
import {
  NotificationsContext,
  type NotificationKind,
  type NotificationOptions,
} from './NotificationsContext.ts';

interface Notification extends NotificationOptions {
  id: number;
  message: string;
  kind: NotificationKind;
}

const DURATION_MS = 5_000;
let nextId = 0;

/** Short, non-blocking messages (toasts). Errors are announced assertively. */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: number) => {
    setNotifications((list) => list.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, kind: NotificationKind = 'success', options: NotificationOptions = {}) => {
      setNotifications((list) => [...list, { id: ++nextId, message, kind, ...options }]);
    },
    [],
  );

  return (
    <NotificationsContext value={notify}>
      {children}
      {/* No label: each toast is announced through its own status or alert role. */}
      <div className="toasts">
        {notifications.map((n) => (
          <Toast key={n.id} notification={n} onDismiss={dismiss} />
        ))}
      </div>
    </NotificationsContext>
  );
}

function Toast({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    if (notification.persistent) return;
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, DURATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [notification.id, notification.persistent, onDismiss]);

  return (
    <div
      className={`toast-item toast-${notification.kind}`}
      role={notification.kind === 'error' ? 'alert' : 'status'}
    >
      <span>{notification.message}</span>
      {notification.action && (
        <button type="button" onClick={notification.action.onClick}>
          {notification.action.label}
        </button>
      )}
      <button
        type="button"
        className="secondary"
        aria-label={fr.notifications.close}
        onClick={() => {
          onDismiss(notification.id);
        }}
      >
        ×
      </button>
    </div>
  );
}
