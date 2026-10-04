import { createContext, useContext } from 'react';

export type NotificationKind = 'success' | 'error';
export interface NotificationOptions {
  /** Stays until dismissed (otherwise disappears after a few seconds). */
  persistent?: boolean;
  action?: { label: string; onClick: () => void };
}

export type Notify = (
  message: string,
  kind?: NotificationKind,
  options?: NotificationOptions,
) => void;

export const NotificationsContext = createContext<Notify | null>(null);

export function useNotify(): Notify {
  const notify = useContext(NotificationsContext);
  if (!notify) throw new Error('useNotify must be used inside <NotificationsProvider>');
  return notify;
}
