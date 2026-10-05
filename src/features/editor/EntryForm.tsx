import { useDeferredValue, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { useBlocker } from 'react-router';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { Flag } from '../../components/Flag.tsx';
import { createDuplicateFinder } from '../../domain/duplicates.ts';
import { LANGS, type Lang } from '../../domain/languages.ts';
import type { Entry, EntryContent } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import {
  draftSignature,
  EDITABLE_TYPES,
  emptyTranslation,
  validateDraft,
  type EntryDraft,
  type TranslationDraft,
} from './entryDraft.ts';
import { DuplicateWarning } from './DuplicateWarning.tsx';
import { TranslationFields } from './TranslationFields.tsx';

interface EntryFormProps {
  initialDraft: EntryDraft;
  /** Shown first and focused: the entry can be started from any language. */
  startLang: Lang;
  /** Existing entries, for the duplicate warnings. */
  entries: readonly Entry[];
  /** The entry being edited, never reported as its own duplicate. */
  entryId?: string;
  /** Content not saved yet (AI result): leaving always asks for confirmation. */
  startDirty?: boolean;
  onSave: (content: EntryContent) => void;
  onCancel: () => void;
}

export function EntryForm({
  initialDraft,
  startLang,
  entries,
  entryId,
  startDirty = false,
  onSave,
  onCancel,
}: EntryFormProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [attempted, setAttempted] = useState(false);
  const [pendingDuplicate, setPendingDuplicate] = useState<EntryContent | null>(null);
  const [focusErrorRequest, setFocusErrorRequest] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const saving = useRef(false);

  const langs = [startLang, ...LANGS.filter((lang) => lang !== startLang)];
  // Errors appear after the first save attempt, then follow the edits live.
  const validation = attempted ? validateDraft(draft) : null;
  const errors = validation && !validation.ok ? validation.errors : {};

  const findDuplicates = useMemo(() => createDuplicateFinder(entries), [entries]);
  const deferredDraft = useDeferredValue(draft);
  const duplicates = (lang: Lang, row: TranslationDraft) =>
    findDuplicates(lang, row.text, entryId === undefined ? {} : { excludeId: entryId });

  // --- Unsaved changes -------------------------------------------------------
  const dirty = startDirty || draftSignature(draft) !== draftSignature(initialDraft);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !saving.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
    };
  }, [dirty]);

  // --- Focus -------------------------------------------------------------------
  useEffect(() => {
    const first = initialDraft.translations[startLang][0];
    if (first) document.getElementById(`${startLang}-${first.key}-text`)?.focus();
  }, [initialDraft, startLang]);

  useEffect(() => {
    if (focusErrorRequest === 0) return;
    // Open the collapsed tense sections that contain errors, then focus the first one.
    const invalid = [
      ...(form.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []),
    ];
    for (const field of invalid) {
      const section = field.closest('details');
      if (section) section.open = true;
    }
    invalid[0]?.focus();
  }, [focusErrorRequest]);

  // --- Edits ---------------------------------------------------------------------
  const updateRow = (lang: Lang, index: number, patch: Partial<TranslationDraft>) => {
    setDraft((current) => {
      const previous = current.translations[lang][index];
      if (!previous) return current;
      const next = { ...previous, ...patch };
      const rows = current.translations[lang].map((row, i) => (i === index ? next : row));
      return { ...current, translations: { ...current.translations, [lang]: rows } };
    });
  };

  const setRows = (lang: Lang, rows: TranslationDraft[]) => {
    setDraft((current) => ({
      ...current,
      translations: { ...current.translations, [lang]: rows },
    }));
  };

  // --- Save --------------------------------------------------------------------------
  const save = (content: EntryContent) => {
    saving.current = true;
    onSave(content);
  };

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    const result = validateDraft(draft);
    if (!result.ok) {
      setFocusErrorRequest((n) => n + 1);
      return;
    }
    const hasDuplicate = LANGS.some((lang) =>
      draft.translations[lang].some((row) => duplicates(lang, row).length > 0),
    );
    if (hasDuplicate) setPendingDuplicate(result.content);
    else save(result.content);
  };

  return (
    <form ref={form} className="entry-form" noValidate onSubmit={submit}>
      <fieldset className="type-choice">
        <legend>{fr.editor.type}</legend>
        {EDITABLE_TYPES.map((type) => (
          <label key={type} className="chip-choice">
            <input
              type="radio"
              name="entry-type"
              value={type}
              checked={draft.type === type}
              onChange={() => {
                setDraft((current) => ({ ...current, type }));
              }}
            />
            {fr.entryTypes[type]}
          </label>
        ))}
      </fieldset>

      {validation && !validation.ok && (
        <p role="alert" className="field-error">
          {fr.editor.errors.summary}
        </p>
      )}

      {langs.map((lang) => {
        const rows = draft.translations[lang];
        const langError = errors[lang];
        return (
          <fieldset key={lang} className="lang-fieldset">
            <legend className="lang-card-title">
              <Flag lang={lang} decorative />
              {fr.langs[lang]}
            </legend>
            {langError && <p className="field-error">{fr.editor.errors[langError]}</p>}

            {rows.map((row, index) => {
              const deferredRow = deferredDraft.translations[lang][index];
              const found = deferredRow ? duplicates(lang, deferredRow) : [];
              return (
                <div key={row.key} className="translation-row">
                  <TranslationFields
                    lang={lang}
                    type={draft.type}
                    row={row}
                    index={index}
                    errors={errors}
                    onChange={(patch) => {
                      updateRow(lang, index, patch);
                    }}
                  />
                  <DuplicateWarning word={row.text} lang={lang} entries={found} />
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => {
                        setRows(
                          lang,
                          rows.filter((_, i) => i !== index),
                        );
                      }}
                    >
                      {fr.editor.removeTranslation}
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              className="secondary"
              onClick={() => {
                setRows(lang, [...rows, emptyTranslation()]);
              }}
            >
              {fr.editor.addTranslation}
            </button>
          </fieldset>
        );
      })}

      <div className="form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          {fr.editor.cancel}
        </button>
        <button type="submit">{fr.editor.save}</button>
      </div>

      <ConfirmDialog
        open={pendingDuplicate !== null}
        title={fr.editor.duplicateTitle}
        confirmLabel={fr.editor.saveAnyway}
        onConfirm={() => {
          if (pendingDuplicate) save(pendingDuplicate);
          setPendingDuplicate(null);
        }}
        onCancel={() => {
          setPendingDuplicate(null);
        }}
      >
        <p>{fr.editor.duplicateText}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title={fr.editor.leaveTitle}
        confirmLabel={fr.editor.leave}
        cancelLabel={fr.editor.stay}
        destructive
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        <p>{fr.editor.leaveText}</p>
      </ConfirmDialog>
    </form>
  );
}
