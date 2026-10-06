import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { Icon } from '../../components/Icon.tsx';
import { LangBadge } from '../../components/LangBadge.tsx';
import { useNotify } from '../../components/notifications/NotificationsContext.ts';
import { useEntries } from '../../data/EntriesContext.ts';
import { useEntryActions } from '../../data/EntryActionsContext.ts';
import { isLang, LANGS } from '../../domain/languages.ts';
import { fr } from '../../i18n/fr.ts';
import { LoadingScreen } from '../../pages/LoadingScreen.tsx';
import type { SavedState } from '../editor/EntryEditorPage.tsx';
import { EntryHero } from './EntryHero.tsx';
import { TranslationList } from './TranslationList.tsx';

export function EntryDetailPage() {
  const { id } = useParams();
  const state = useEntries();
  const actions = useEntryActions();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  // The language shown first in the dictionary is the main one here too.
  const [params] = useSearchParams();
  const langParam = params.get('lang');
  const heroLang = isLang(langParam) ? langParam : 'fr';
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
      <nav className="page-top">
        <button type="button" className="round-button" aria-label={fr.entry.back} onClick={goBack}>
          <Icon name="back" />
        </button>
      </nav>

      <EntryHero entry={entry} lang={heroLang} heading="h1" />

      <h2 className="section-title">{fr.entry.translations}</h2>
      <div className="lang-grid">
        {LANGS.filter((lang) => lang !== heroLang).map((lang) => (
          <section key={lang} className="lang-card" aria-labelledby={`lang-${lang}`}>
            <h3 id={`lang-${lang}`} className="lang-card-title">
              <LangBadge lang={lang} decorative />
              {fr.langs[lang]}
            </h3>
            <TranslationList entry={entry} lang={lang} />
          </section>
        ))}
      </div>

      <div className="bottom-actions">
        <button
          type="button"
          className="round-button danger-soft"
          aria-label={fr.entry.delete}
          title={fr.entry.delete}
          onClick={() => {
            setConfirmDelete(true);
          }}
        >
          <Icon name="trash" />
        </button>
        <Link className="button primary" to={`/entries/${entry.id}/edit`}>
          <Icon name="edit" />
          {fr.entry.edit}
        </Link>
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
