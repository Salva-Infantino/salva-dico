import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { Flag } from '../../components/Flag.tsx';
import { useNotify } from '../../components/notifications/NotificationsContext.ts';
import { useEntries } from '../../data/EntriesContext.ts';
import { useEntryActions } from '../../data/EntryActionsContext.ts';
import { LANGS } from '../../domain/languages.ts';
import { fr } from '../../i18n/fr.ts';
import { LoadingScreen } from '../../pages/LoadingScreen.tsx';
import type { SavedState } from '../editor/EntryEditorPage.tsx';
import { TranslationList } from './TranslationList.tsx';

export function EntryDetailPage() {
  const { id } = useParams();
  const state = useEntries();
  const actions = useEntryActions();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const entry =
    state.status === 'ready'
      ? state.entries.find((candidate) => candidate.id === id && !candidate.deleted)
      : undefined;

  // Back to the previous search if we came from the dictionary, home otherwise.
  const goBack = () => {
    if (location.key === 'default') void navigate('/');
    else void navigate(-1);
  };

  if (!entry) {
    // Just created: the local write reaches the entries list a moment later.
    if ((location.state as SavedState | null)?.savedId === id) return <LoadingScreen />;
    return (
      <main className="page">
        <h1>{fr.entry.notFound}</h1>
        <Link to="/">{fr.entry.back}</Link>
      </main>
    );
  }

  return (
    <main className="page entry-detail">
      <nav>
        <button type="button" className="link-button" onClick={goBack}>
          ← {fr.entry.back}
        </button>
      </nav>
      <h1 className="entry-title">{fr.entryTypes[entry.type]}</h1>

      <div className="entry-actions">
        <button
          type="button"
          role="switch"
          aria-checked={entry.mastered}
          className="switch"
          onClick={() => {
            actions.setMastered(entry.id, !entry.mastered);
          }}
        >
          <span className="switch-track" aria-hidden="true" />
          {fr.entry.mastered}
        </button>
        <Link className="button secondary" to={`/entries/${entry.id}/edit`}>
          {fr.entry.edit}
        </Link>
        <button
          type="button"
          className="secondary danger-outline"
          onClick={() => {
            setConfirmDelete(true);
          }}
        >
          {fr.entry.delete}
        </button>
      </div>

      <div className="lang-grid">
        {LANGS.map((lang) => (
          <section key={lang} className="lang-card" aria-labelledby={`lang-${lang}`}>
            <h2 id={`lang-${lang}`} className="lang-card-title">
              <Flag lang={lang} decorative />
              {fr.langs[lang]}
            </h2>
            <TranslationList entry={entry} lang={lang} />
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={fr.entry.deleteTitle}
        confirmLabel={fr.entry.delete}
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          actions.remove(entry.id);
          notify(fr.notifications.deleted);
          goBack();
        }}
        onCancel={() => {
          setConfirmDelete(false);
        }}
      >
        <p>{fr.entry.deleteText}</p>
      </ConfirmDialog>
    </main>
  );
}
