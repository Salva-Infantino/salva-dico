import { FirebaseError } from 'firebase/app';
import { useEffect, useState, type ReactNode } from 'react';
import { browserStorage } from './browserStorage.ts';
import { EntriesContext, type EntriesState } from './EntriesContext.ts';
import { startEntriesSync } from './entriesSync.ts';
import { getFirebase, requestPersistentStorage } from './firebase.ts';

export function EntriesProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [state, setState] = useState<EntriesState>({ status: 'loading' });

  useEffect(() => {
    void requestPersistentStorage();
    return startEntriesSync({
      db: getFirebase().db,
      uid,
      storage: browserStorage(),
      onEntries: (entries) => {
        setState({ status: 'ready', entries: [...entries.values()], syncFailed: false });
      },
      onError: (error) => {
        if (error instanceof FirebaseError && error.code === 'permission-denied') {
          setState({ status: 'denied' });
          return;
        }
        console.error('Entries sync failed', error);
        setState((previous) =>
          previous.status === 'ready'
            ? { ...previous, syncFailed: true }
            : { status: 'ready', entries: [], syncFailed: true },
        );
      },
    });
  }, [uid]);

  return <EntriesContext value={state}>{children}</EntriesContext>;
}
