import type { Lang } from '../../domain/languages.ts';
import { fr } from '../../i18n/fr.ts';
import { ConjugationFields } from './ConjugationFields.tsx';
import type { DraftErrors, EditableType, TranslationDraft } from './entryDraft.ts';
import { TextField } from './fields.tsx';

interface TranslationFieldsProps {
  lang: Lang;
  type: EditableType;
  row: TranslationDraft;
  index: number;
  errors: DraftErrors;
  onChange: (patch: Partial<TranslationDraft>) => void;
}

/** The inputs of one translation: the word, or the infinitive and its conjugation. */
export function TranslationFields({
  lang,
  type,
  row,
  index,
  errors,
  onChange,
}: TranslationFieldsProps) {
  if (type === 'verb') {
    return (
      <ConjugationFields lang={lang} row={row} index={index} errors={errors} onChange={onChange} />
    );
  }

  return (
    <TextField
      id={`${lang}-${row.key}-text`}
      label={fr.editor.fields.word}
      lang={lang}
      value={row.text}
      error={errors[`${lang}.${String(index)}.text`]}
      onChange={(text) => {
        onChange({ text });
      }}
    />
  );
}
