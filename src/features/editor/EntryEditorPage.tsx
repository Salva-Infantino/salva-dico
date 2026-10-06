import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useNotify } from '../../components/notifications/NotificationsContext.ts';
import { useEntries } from '../../data/EntriesContext.ts';
import { useEntryActions } from '../../data/EntryActionsContext.ts';
import { isLang } from '../../domain/languages.ts';
import type { Entry, EntryContent } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import { AiPanel, type AiRequestDraft } from './AiPanel.tsx';
import { draftFromContent, emptyDraft, type EntryDraft } from './entryDraft.ts';
import { EntryForm } from './EntryForm.tsx';

/** State passed to the detail page right after a save, before the sync echoes it. */
export interface SavedState {
  savedId: string;
}

/** /entries/new?lang=it&text=ragazzo&mode=manual — or /entries/:id/edit. */
export function EntryEditorPage() {
  const { id } = useParams();
  // A new mount per entry: the draft is initialized once, then owned by the form.
  return id === undefined ? <NewEntry /> : <EditEntry key={id} id={id} />;
}

function useEditorContext() {
  const state = useEntries();
  const actions = useEntryActions();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();
  const entries = useMemo<readonly Entry[]>(
    () => (state.status === 'ready' ? state.entries : []),
    [state],
  );
  const goBack = (fallback: string) => {
    if (location.key === 'default') void navigate(fallback);
    else void navigate(-1);
  };
  return { entries, actions, notify, navigate, goBack };
}

function EditEntry({ id }: { id: string }) {
  const { entries, actions, notify, goBack } = useEditorContext();
  // Initialized once: later sync updates must not reset what is being typed.
  const [draft] = useState<EntryDraft | null>(() => {
    const existing = entries.find((e) => e.id === id && !e.deleted);
    return existing ? draftFromContent(existing) : null;
  });

  if (draft === null) {
    return (
      <main className="page">
        <h1>{fr.entry.notFound}</h1>
        <Link to="/">{fr.entry.back}</Link>
      </main>
    );
  }

  return (
    <main className="page editor">
      <h1>{fr.editor.editTitle}</h1>
      <EntryForm
        initialDraft={draft}
        startLang="fr"
        entries={entries}
        entryId={id}
        onSave={(content) => {
          actions.update(id, content);
          notify(fr.notifications.updated);
          goBack(`/entries/${id}`);
        }}
        onCancel={() => {
          goBack(`/entries/${id}`);
        }}
      />
    </main>
  );
}

type Mode = 'ai' | 'manual';

function NewEntry() {
  const [params] = useSearchParams();
  const { entries, actions, notify, navigate, goBack } = useEditorContext();
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'manual' ? 'manual' : 'ai');
  const [request, setRequest] = useState<AiRequestDraft>(() => {
    const lang = params.get('lang');
    return { lang: isLang(lang) ? lang : 'fr', text: params.get('text') ?? '', type: '' };
  });
  // AI result being reviewed: nothing is saved before the user validates.
  const [review, setReview] = useState<EntryDraft | null>(null);
  // Created when switching to manual mode, from what was typed for the AI.
  const [manualDraft, setManualDraft] = useState<EntryDraft | null>(() =>
    mode === 'manual' ? draftFromRequest(request) : null,
  );

  const save = (content: EntryContent) => {
    const newId = actions.create(content);
    notify(fr.notifications.added);
    void navigate(`/entries/${newId}`, {
      replace: true,
      state: { savedId: newId } satisfies SavedState,
    });
  };

  if (review) {
    return (
      <main className="page editor">
        <h1>{fr.ai.reviewTitle}</h1>
        <p className="muted">{fr.ai.reviewHint}</p>
        <EntryForm
          initialDraft={review}
          startLang={request.lang}
          entries={entries}
          startDirty
          onSave={save}
          onCancel={() => {
            setReview(null);
          }}
        />
      </main>
    );
  }

  return (
    <main className="page editor">
      <h1>{fr.editor.newTitle}</h1>
      <div className="mode-switch" role="group" aria-label={fr.ai.modeLabel}>
        {(['ai', 'manual'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className="chip"
            aria-pressed={mode === value}
            onClick={() => {
              if (value === 'manual' && mode !== 'manual')
                setManualDraft(draftFromRequest(request));
              setMode(value);
            }}
          >
            {fr.ai.modes[value]}
          </button>
        ))}
      </div>
      {mode === 'ai' || !manualDraft ? (
        <AiPanel
          value={request}
          onChange={setRequest}
          entries={entries}
          onResult={(content) => {
            setReview(draftFromContent(content));
          }}
        />
      ) : (
        <EntryForm
          initialDraft={manualDraft}
          startLang={request.lang}
          entries={entries}
          onSave={save}
          onCancel={() => {
            goBack('/');
          }}
        />
      )}
    </main>
  );
}

function draftFromRequest(request: AiRequestDraft): EntryDraft {
  return emptyDraft({
    lang: request.lang,
    text: request.text,
    ...(request.type === '' ? {} : { type: request.type }),
  });
}
