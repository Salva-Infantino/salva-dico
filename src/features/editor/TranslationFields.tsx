import type { Lang } from '../../domain/languages.ts';
import { fr } from '../../i18n/fr.ts';
import type { DraftErrors, EditableType, TranslationDraft } from './entryDraft.ts';
import { SelectField, TextField } from './fields.tsx';
import { PLURAL_ARTICLES, SINGULAR_ARTICLES } from './grammarHints.ts';

interface TranslationFieldsProps {
  lang: Lang;
  type: EditableType;
  row: TranslationDraft;
  index: number;
  errors: DraftErrors;
  onChange: (patch: Partial<TranslationDraft>) => void;
}

/** The inputs of one translation, depending on the entry type and the language. */
export function TranslationFields({
  lang,
  type,
  row,
  index,
  errors,
  onChange,
}: TranslationFieldsProps) {
  const id = (field: string) => `${lang}-${row.key}-${field}`;
  const error = (field: keyof TranslationDraft) => errors[`${lang}.${String(index)}.${field}`];
  const text = (field: keyof TranslationDraft, label: string) => (
    <TextField
      id={id(field)}
      label={label}
      lang={lang}
      value={row[field] as string}
      error={error(field)}
      onChange={(value) => {
        onChange({ [field]: value });
      }}
    />
  );

  if (type === 'expression') return text('text', fr.editor.fields.expression);

  if (type === 'adjective') {
    if (lang === 'en') return text('text', fr.editor.fields.adjective);
    return (
      <div className="field-grid">
        {text('text', fr.editor.fields.mascSing)}
        {text('femSing', fr.editor.fields.femSing)}
        {text('mascPlural', fr.editor.fields.mascPlural)}
        {text('femPlural', fr.editor.fields.femPlural)}
      </div>
    );
  }

  // Noun
  if (lang === 'en') {
    return (
      <div className="field-grid">
        {text('text', fr.editor.fields.word)}
        {text('plural', fr.editor.fields.irregularPlural)}
      </div>
    );
  }

  const genderError = error('gender');
  return (
    <div className="noun-fields">
      <div className="field-grid">
        <SelectField
          id={id('article')}
          label={fr.editor.fields.article}
          value={row.article}
          options={SINGULAR_ARTICLES[lang].map((option) => option.article)}
          error={error('article')}
          onChange={(article) => {
            onChange({ article });
          }}
        />
        {text('text', fr.editor.fields.word)}
      </div>

      <fieldset
        className="gender"
        aria-invalid={genderError !== undefined}
        aria-describedby={genderError ? id('gender-error') : undefined}
      >
        <legend>{fr.editor.fields.gender}</legend>
        {(['m', 'f'] as const).map((gender) => (
          <label key={gender} className="inline-choice">
            <input
              type="radio"
              name={id('gender')}
              value={gender}
              checked={row.gender === gender}
              onChange={() => {
                onChange({ gender });
              }}
            />
            {gender === 'm' ? fr.editor.fields.masculine : fr.editor.fields.feminine}
          </label>
        ))}
        {genderError && (
          <p id={id('gender-error')} className="field-error">
            {fr.editor.errors[genderError]}
          </p>
        )}
      </fieldset>

      <label className="inline-choice">
        <input
          type="checkbox"
          checked={!row.hasPlural}
          onChange={(event) => {
            onChange({ hasPlural: !event.target.checked });
          }}
        />
        {fr.editor.fields.noPlural}
      </label>

      {row.hasPlural && (
        <div className="field-grid">
          <SelectField
            id={id('pluralArticle')}
            label={fr.editor.fields.pluralArticle}
            value={row.pluralArticle}
            options={PLURAL_ARTICLES[lang]}
            error={error('pluralArticle')}
            onChange={(pluralArticle) => {
              onChange({ pluralArticle });
            }}
          />
          {text('plural', fr.editor.fields.plural)}
        </div>
      )}
    </div>
  );
}
