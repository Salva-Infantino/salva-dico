import { useMemo, type ReactNode } from 'react';
import { useNotify } from '../components/notifications/NotificationsContext.ts';
import { fr } from '../i18n/fr.ts';
import {
  createEntry,
  importEntries,
  setMastered,
  softDeleteEntry,
  updateEntryContent,
} from './entriesRepository.ts';
import { EntryActionsContext, type EntryActions } from './EntryActionsContext.ts';
import { getFirebase } from './firebase.ts';

/** Firestore-backed actions for the signed-in user. */
export function EntryActionsProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const notify = useNotify();

  const actions = useMemo<EntryActions>(() => {
    const { db } = getFirebase();
    // The promise settles when the server answers, possibly much later (offline).
    // A rejection means the server refused the write: tell the user.
    const watch = (committed: Promise<void>) => {
      committed.catch((error: unknown) => {
        console.error('Write rejected by the server', error);
        notify(fr.notifications.saveFailed, 'error');
      });
    };
    return {
      create: (content) => {
        const { id, committed } = createEntry(db, uid, content);
        watch(committed);
        return id;
      },
      update: (id, content) => {
        watch(updateEntryContent(db, uid, id, content));
      },
      remove: (id) => {
        watch(softDeleteEntry(db, uid, id));
      },
      setMastered: (id, mastered) => {
        watch(setMastered(db, uid, id, mastered));
      },
      importEntries: (entries) => {
        watch(importEntries(db, uid, entries));
      },
    };
  }, [uid, notify]);

  return <EntryActionsContext value={actions}>{children}</EntryActionsContext>;
}
