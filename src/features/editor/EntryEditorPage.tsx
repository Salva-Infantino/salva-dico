import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useNotify } from '../../components/notifications/NotificationsContext.ts';
import { useEntries } from '../../data/EntriesContext.ts';
import { useEntryActions } from '../../data/EntryActionsContext.ts';
import { LANGS, type Lang } from '../../domain/languages.ts';
import type { Entry, EntryContent } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import { draftFromEntry, emptyDraft, type EntryDraft } from './entryDraft.ts';
import { EntryForm } from './EntryForm.tsx';

/** State passed to the detail page right after a save, before the sync echoes it. */
export interface SavedState {
  savedId: string;
}

const isLang = (value: string | null): value is Lang =>
  value !== null && (LANGS as readonly string[]).includes(value);

/** /entries/new?lang=it&text=ragazzo — or /entries/:id/edit. */
export function EntryEditorPage() {
  const { id } = useParams();
  // A new mount per entry: the draft is initialized once, then owned by the form.
  return <Editor key={id ?? 'new'} id={id} />;
}

function Editor({ id }: { id: string | undefined }) {
  const [params] = useSearchParams();
  const state = useEntries();
  const actions = useEntryActions();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();

  const entries = useMemo<readonly Entry[]>(
    () => (state.status === 'ready' ? state.entries : []),
    [state],
  );
  const existing = id === undefined ? undefined : entries.find((e) => e.id === id && !e.deleted);

  // Initialized once: later sync updates must not reset what is being typed.
  const [initial] = useState<{ draft: EntryDraft | null; startLang: Lang }>(() => {
    if (id !== undefined) {
      return { draft: existing ? draftFromEntry(existing) : null, startLang: 'fr' };
    }
    const lang = params.get('lang');
    const startLang = isLang(lang) ? lang : 'fr';
    return { draft: emptyDraft({ lang: startLang, text: params.get('text') ?? '' }), startLang };
  });

  const goBack = () => {
    if (location.key === 'default') void navigate(id === undefined ? '/' : `/entries/${id}`);
    else void navigate(-1);
  };

  const save = (content: EntryContent) => {
    if (id === undefined) {
      const newId = actions.create(content);
      notify(fr.notifications.added);
      void navigate(`/entries/${newId}`, {
        replace: true,
        state: { savedId: newId } satisfies SavedState,
      });
    } else {
      actions.update(id, content);
      notify(fr.notifications.updated);
      goBack();
    }
  };

  if (initial.draft === null) {
    return (
      <main className="page">
        <h1>{existing ? fr.editor.editTitle : fr.entry.notFound}</h1>
        {existing && <p>{fr.entry.verbEditLater}</p>}
        <Link to={existing ? `/entries/${existing.id}` : '/'}>{fr.entry.back}</Link>
      </main>
    );
  }

  return (
    <main className="page editor">
      <h1>{id === undefined ? fr.editor.newTitle : fr.editor.editTitle}</h1>
      <EntryForm
        initialDraft={initial.draft}
        startLang={initial.startLang}
        entries={entries}
        {...(id === undefined ? {} : { entryId: id })}
        onSave={save}
        onCancel={goBack}
      />
    </main>
  );
}
