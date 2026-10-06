import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { Icon } from '../../components/Icon.tsx';
import { LangBadge } from '../../components/LangBadge.tsx';
import { useTranslate } from '../../data/TranslatorContext.ts';
import type { TranslateFailure } from '../../data/translateClient.ts';
import { createDuplicateFinder } from '../../domain/duplicates.ts';
import { ENTRY_TYPES, LANGS, type EntryType, type Lang } from '../../domain/languages.ts';
import type { Entry, EntryContent } from '../../domain/schemas.ts';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.ts';
import { fr } from '../../i18n/fr.ts';
import { DuplicateWarning } from './DuplicateWarning.tsx';
import { TextField } from './fields.tsx';

export interface AiRequestDraft {
  lang: Lang;
  text: string;
  /** Empty: the AI detects the type. */
  type: EntryType | '';
}

interface AiPanelProps {
  /** Owned by the page, so switching to manual mode or an error never loses the word. */
  value: AiRequestDraft;
  onChange: (value: AiRequestDraft) => void;
  entries: readonly Entry[];
  onResult: (content: EntryContent) => void;
}

/** Asks the AI for a complete entry from one word in any language. */
export function AiPanel({ value, onChange, entries, onResult }: AiPanelProps) {
  const translate = useTranslate();
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Exclude<TranslateFailure, 'cancelled'> | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const request = useRef<AbortController | null>(null);

  const findDuplicates = useMemo(() => createDuplicateFinder(entries), [entries]);
  const duplicates = findDuplicates(value.lang, value.text);

  // Leaving the page cancels a pending request.
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );

  const run = async () => {
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    const result = await translate(
      {
        sourceLang: value.lang,
        text: value.text.trim(),
        ...(value.type === '' ? {} : { type: value.type }),
      },
      controller.signal,
    );
    if (controller.signal.aborted) return;
    setLoading(false);
    if (result.ok) onResult(result.content);
    else if (result.error !== 'cancelled') setError(result.error);
  };

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || !online || value.text.trim() === '') return;
    // Check the dictionary before spending AI quota.
    if (duplicates.length > 0) setConfirmDuplicate(true);
    else void run();
  };

  const cancel = () => {
    request.current?.abort();
    setLoading(false);
  };

  return (
    <form className="ai-panel panel" noValidate onSubmit={submit}>
      <p className="muted">{fr.ai.intro}</p>
      <fieldset className="choice-group">
        <legend>{fr.ai.lang}</legend>
        {LANGS.map((lang) => (
          <label key={lang} className={`chip-choice lang-${lang}`}>
            <input
              type="radio"
              name="ai-lang"
              value={lang}
              checked={value.lang === lang}
              onChange={() => {
                onChange({ ...value, lang });
              }}
            />
            <LangBadge lang={lang} decorative />
            {fr.langs[lang]}
          </label>
        ))}
      </fieldset>

      <TextField
        id="ai-text"
        label={fr.ai.word}
        lang={value.lang}
        value={value.text}
        error={undefined}
        onChange={(text) => {
          onChange({ ...value, text });
        }}
      />

      <div className="field">
        <label htmlFor="ai-type">{fr.ai.type}</label>
        <select
          id="ai-type"
          value={value.type}
          onChange={(event) => {
            onChange({ ...value, type: event.target.value as EntryType | '' });
          }}
        >
          <option value="">{fr.ai.autoType}</option>
          {ENTRY_TYPES.map((type) => (
            <option key={type} value={type}>
              {fr.entryTypes[type]}
            </option>
          ))}
        </select>
      </div>

      <DuplicateWarning word={value.text} lang={value.lang} entries={duplicates} />
      {!online && <p className="warning">{fr.ai.offline}</p>}
      {error && (
        <p role="alert" className="field-error">
          {fr.ai.errors[error]}
        </p>
      )}

      <div className="panel-actions">
        {loading ? (
          <>
            <span role="status" className="muted">
              {fr.ai.loading}
            </span>
            <button type="button" className="secondary" onClick={cancel}>
              {fr.ai.cancel}
            </button>
          </>
        ) : (
          <button type="submit" disabled={!online || value.text.trim() === ''}>
            <Icon name="sparkles" />
            {fr.ai.submit}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDuplicate}
        title={fr.editor.duplicateTitle}
        confirmLabel={fr.ai.translateAnyway}
        onConfirm={() => {
          setConfirmDuplicate(false);
          void run();
        }}
        onCancel={() => {
          setConfirmDuplicate(false);
        }}
      >
        <p>{fr.editor.duplicateText}</p>
      </ConfirmDialog>
    </form>
  );
}
