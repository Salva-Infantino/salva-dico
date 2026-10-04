import { useEntries } from '../data/EntriesContext.ts';
import { fr } from '../i18n/fr.ts';

export function HomePage() {
  const state = useEntries();
  const count =
    state.status === 'ready' ? state.entries.filter((entry) => !entry.deleted).length : 0;

  return (
    <main className="page">
      <h1>{fr.home.title}</h1>
      {state.status === 'ready' && state.syncFailed && (
        <p role="status" className="error">
          {fr.sync.failed}
        </p>
      )}
      <p className="muted">{count === 0 ? fr.home.empty : fr.home.entryCount(count)}</p>
    </main>
  );
}
