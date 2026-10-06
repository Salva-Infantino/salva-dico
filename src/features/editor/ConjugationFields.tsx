import { Icon } from '../../components/Icon.tsx';
import { AUXILIARIES, IMPERATIVE, IMPERATIVE_LABELS, TENSES } from '../../domain/conjugation.ts';
import { PERSON_LABELS, type Lang } from '../../domain/languages.ts';
import { fr } from '../../i18n/fr.ts';
import { TenseName } from '../conjugation/TenseName.tsx';
import { cells, type DraftErrors, type TranslationDraft } from './entryDraft.ts';
import { SelectField, TextField } from './fields.tsx';

interface ConjugationFieldsProps {
  lang: Lang;
  row: TranslationDraft;
  index: number;
  errors: DraftErrors;
  onChange: (patch: Partial<TranslationDraft>) => void;
}

/**
 * Infinitive and full conjugation of one verb. Each tense is a collapsible section
 * (a verb has 36 cells per language); sections with errors open on save.
 */
export function ConjugationFields({ lang, row, index, errors, onChange }: ConjugationFieldsProps) {
  const id = (field: string) => `${lang}-${row.key}-${field}`;
  const error = (field: string) => errors[`${lang}.${String(index)}.${field}`];
  const hasError = (prefix: string) =>
    Object.keys(errors).some((key) => key.startsWith(`${lang}.${String(index)}.${prefix}`));

  const infinitive = (
    <TextField
      id={id('text')}
      label={fr.editor.fields.infinitive}
      lang={lang}
      value={row.text}
      error={error('text')}
      onChange={(text) => {
        onChange({ text });
      }}
    />
  );

  if (lang === 'en') {
    return (
      <div className="field-grid">
        {infinitive}
        <TextField
          id={id('pastSimple')}
          label={fr.editor.fields.pastSimple}
          lang={lang}
          value={row.pastSimple}
          error={error('conjugation.pastSimple')}
          onChange={(pastSimple) => {
            onChange({ pastSimple });
          }}
        />
        <TextField
          id={id('pastParticiple')}
          label={fr.editor.fields.pastParticiple}
          lang={lang}
          value={row.pastParticiple}
          error={error('conjugation.pastParticiple')}
          onChange={(pastParticiple) => {
            onChange({ pastParticiple });
          }}
        />
        <label className="inline-choice">
          <input
            type="checkbox"
            checked={row.irregular}
            onChange={(event) => {
              onChange({ irregular: event.target.checked });
            }}
          />
          {fr.editor.fields.irregular}
        </label>
      </div>
    );
  }

  const imperative = IMPERATIVE[lang];
  const setTenseCell = (key: string, person: number, value: string) => {
    const values = cells(row.tenses[key], 6);
    values[person] = value;
    onChange({ tenses: { ...row.tenses, [key]: values } });
  };
  const setImperativeCell = (
    field: 'imperativeAffirmative' | 'imperativeNegative',
    person: number,
    value: string,
  ) => {
    const values = cells(row[field], 3);
    values[person] = value;
    onChange({ [field]: values });
  };

  return (
    <div className="verb-fields">
      <div className="field-grid">
        {infinitive}
        {lang !== 'es' && (
          <SelectField
            id={id('auxiliary')}
            label={fr.editor.fields.auxiliary}
            value={row.auxiliary}
            options={AUXILIARIES[lang]}
            error={error('conjugation.auxiliary')}
            onChange={(auxiliary) => {
              onChange({ auxiliary });
            }}
          />
        )}
      </div>
      <label className="inline-choice">
        <input
          type="checkbox"
          checked={row.reflexive}
          onChange={(event) => {
            onChange({ reflexive: event.target.checked });
          }}
        />
        {fr.editor.fields.reflexive}
      </label>

      {TENSES[lang].map((tense) => {
        const values = cells(row.tenses[tense.key], 6);
        return (
          <details key={tense.key} className="tense-fields">
            <summary className={hasError(`conjugation.${tense.key}.`) ? 'has-error' : undefined}>
              <span>
                <TenseName lang={lang} tense={tense} />
              </span>
              <Icon name="chevronDown" />
            </summary>
            <div className="field-grid">
              {PERSON_LABELS[lang].map((pronoun, person) => (
                <TextField
                  key={pronoun}
                  id={id(`${tense.key}-${String(person)}`)}
                  label={pronoun}
                  lang={lang}
                  value={values[person] ?? ''}
                  error={error(`conjugation.${tense.key}.${String(person)}`)}
                  onChange={(value) => {
                    setTenseCell(tense.key, person, value);
                  }}
                />
              ))}
            </div>
          </details>
        );
      })}

      <details className="tense-fields">
        <summary className={hasError(`conjugation.${imperative.key}.`) ? 'has-error' : undefined}>
          <span>
            <TenseName lang={lang} tense={imperative} />
          </span>
          <Icon name="chevronDown" />
        </summary>
        <div className="field-grid imperative-grid">
          {IMPERATIVE_LABELS[lang].map((pronoun, person) => (
            <div key={pronoun} className="imperative-row">
              {(
                [
                  ['imperativeAffirmative', 'affirmative', fr.editor.fields.affirmative],
                  ['imperativeNegative', 'negative', fr.editor.fields.negative],
                ] as const
              ).map(([field, schemaField, label]) => (
                <TextField
                  key={field}
                  id={id(`${field}-${String(person)}`)}
                  label={`${pronoun} (${label})`}
                  lang={lang}
                  value={cells(row[field], 3)[person] ?? ''}
                  error={error(`conjugation.${imperative.key}.${schemaField}.${String(person)}`)}
                  onChange={(value) => {
                    setImperativeCell(field, person, value);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
