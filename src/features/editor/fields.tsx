import type { ReactNode } from 'react';
import { fr } from '../../i18n/fr.ts';
import type { ErrorCode } from './entryDraft.ts';

interface FieldProps {
  id: string;
  label: string;
  error: ErrorCode | undefined;
  children: (aria: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

/** Label + control + error message, wired for screen readers. */
export function Field({ id, label, error, children }: FieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': error ? errorId : undefined,
      })}
      {error && (
        <p id={errorId} className="field-error">
          {fr.editor.errors[error]}
        </p>
      )}
    </div>
  );
}

export function TextField({
  id,
  label,
  value,
  error,
  lang,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error: ErrorCode | undefined;
  lang: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field id={id} label={label} error={error}>
      {(aria) => (
        <input
          {...aria}
          type="text"
          lang={lang}
          value={value}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      )}
    </Field>
  );
}

export function SelectField({
  id,
  label,
  value,
  options,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  error: ErrorCode | undefined;
  onChange: (value: string) => void;
}) {
  // A value outside the usual options (imported data) stays selectable.
  const all = value === '' || options.includes(value) ? options : [...options, value];
  return (
    <Field id={id} label={label} error={error}>
      {(aria) => (
        <select
          {...aria}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        >
          <option value="">—</option>
          {all.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
