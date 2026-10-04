import { createContext, useContext } from 'react';
import type { Entry } from '../domain/schemas.ts';

export type EntriesState =
  | { status: 'loading' }
  /** `entries` includes tombstones; `syncFailed` keeps local data usable after a sync error. */
  | { status: 'ready'; entries: readonly Entry[]; syncFailed: boolean }
  /** The rules refused access: this account is not the owner. */
  | { status: 'denied' };

export const EntriesContext = createContext<EntriesState | null>(null);

export function useEntries(): EntriesState {
  const value = useContext(EntriesContext);
  if (!value) throw new Error('useEntries must be used inside <EntriesProvider>');
  return value;
}
