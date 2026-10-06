import { useId } from 'react';
import { ENTRY_TYPES, LANGS, type EntryType, type Lang } from '../../domain/languages.ts';
import { fr } from '../../i18n/fr.ts';

/**
 * Native radio buttons styled as chips or segments: arrow keys and screen readers
 * work out of the box.
 */
function RadioGroup<T extends string>({
  legend,
  className,
  options,
  value,
  onChange,
}: {
  legend: string;
  className: string;
  options: readonly { value: T; label: string; extraClass?: string; srLabel?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className={className}>
      <legend className="visually-hidden">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={option.extraClass}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => {
              onChange(option.value);
            }}
          />
          <span aria-hidden={option.srLabel ? true : undefined}>{option.label}</span>
          {option.srLabel && <span className="visually-hidden">{option.srLabel}</span>}
        </label>
      ))}
    </fieldset>
  );
}

/** Language shown first in each row (and used for the alphabetical order). */
export function LangChoice({ value, onChange }: { value: Lang; onChange: (lang: Lang) => void }) {
  return (
    <RadioGroup
      legend={fr.home.displayLang}
      className="lang-chips"
      options={LANGS.map((lang) => ({
        value: lang,
        label: lang.toUpperCase(),
        srLabel: fr.langs[lang],
        extraClass: `lang-${lang}`,
      }))}
      value={value}
      onChange={onChange}
    />
  );
}

const ALL = 'all';

/** All entries, only words or only verbs. */
export function TypeChoice({
  value,
  onChange,
}: {
  value: EntryType | null;
  onChange: (type: EntryType | null) => void;
}) {
  return (
    <RadioGroup<EntryType | typeof ALL>
      legend={fr.home.typeFilter}
      className="segmented"
      options={[
        { value: ALL, label: fr.home.allTypes },
        ...ENTRY_TYPES.map((type) => ({ value: type, label: fr.home.typeFilters[type] })),
      ]}
      value={value ?? ALL}
      onChange={(next) => {
        onChange(next === ALL ? null : next);
      }}
    />
  );
}
