import { createContext, useContext } from 'react';
import type { ExportedEntry } from '../domain/backup.ts';
import type { EntryContent } from '../domain/schemas.ts';

/**
 * Write operations available to the UI. They return immediately: Firestore applies
 * writes to the local cache at once (offline too) and syncs them later.
 */
export interface EntryActions {
  /** Returns the id of the new entry. */
  create: (content: EntryContent) => string;
  update: (id: string, content: EntryContent) => void;
  remove: (id: string) => void;
  setMastered: (id: string, mastered: boolean) => void;
  /** Adds entries from an export, under their own ids. */
  importEntries: (entries: readonly ExportedEntry[]) => void;
}

export const EntryActionsContext = createContext<EntryActions | null>(null);

export function useEntryActions(): EntryActions {
  const actions = useContext(EntryActionsContext);
  if (!actions) throw new Error('useEntryActions must be used inside <EntryActionsProvider>');
  return actions;
}
