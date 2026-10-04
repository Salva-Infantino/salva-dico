import { LANGS, type EntryType, type Lang } from '../../domain/languages.ts';
import { entryContentSchema, type Entry, type EntryContent } from '../../domain/schemas.ts';

/** Verbs need the conjugation editor (step 5): not editable in this form yet. */
export type EditableType = Exclude<EntryType, 'verb'>;
export const EDITABLE_TYPES: readonly EditableType[] = ['noun', 'adjective', 'expression'];

/**
 * One translation being edited. Flat on purpose: switching the entry type keeps
 * what was typed. `text` holds the word, the expression, or the masculine singular
 * of an adjective.
 */
export interface TranslationDraft {
  key: string;
  text: string;
  article: string;
  gender: '' | 'm' | 'f';
  hasPlural: boolean;
  plural: string;
  pluralArticle: string;
  femSing: string;
  mascPlural: string;
  femPlural: string;
}

export interface EntryDraft {
  type: EditableType;
  translations: Record<Lang, TranslationDraft[]>;
}

/** Field-level errors, keyed by `lang` or `lang.index.field` (ex. "it.0.gender"). */
export type DraftErrors = Partial<Record<string, ErrorCode>>;
export type ErrorCode = 'required' | 'gender' | 'pluralArticle' | 'missingLanguage';

let nextKey = 0;
const newKey = () => `t${String(++nextKey)}`;

export function emptyTranslation(text = ''): TranslationDraft {
  return {
    key: newKey(),
    text,
    article: '',
    gender: '',
    hasPlural: true,
    plural: '',
    pluralArticle: '',
    femSing: '',
    mascPlural: '',
    femPlural: '',
  };
}

export function emptyDraft(
  options: { type?: EditableType; lang?: Lang; text?: string } = {},
): EntryDraft {
  const translations = {} as Record<Lang, TranslationDraft[]>;
  for (const lang of LANGS) {
    translations[lang] = [emptyTranslation(lang === options.lang ? (options.text ?? '') : '')];
  }
  return { type: options.type ?? 'noun', translations };
}

/** Draft of an existing entry, or null for verbs. */
export function draftFromEntry(entry: Entry): EntryDraft | null {
  if (entry.type === 'verb') return null;
  const translations = {} as Record<Lang, TranslationDraft[]>;
  for (const lang of LANGS) {
    translations[lang] = (entry.translations[lang] as readonly Record<string, unknown>[]).map(
      (t) => {
        const draft = emptyTranslation();
        const str = (key: string) => (typeof t[key] === 'string' ? t[key] : '');
        draft.text = 'mascSing' in t ? str('mascSing') : str('text');
        draft.article = str('article');
        draft.gender = t['gender'] === 'm' || t['gender'] === 'f' ? t['gender'] : '';
        draft.plural = str('plural');
        draft.pluralArticle = str('pluralArticle');
        // A romance noun without plural is uncountable.
        draft.hasPlural = !('article' in t) || 'plural' in t;
        draft.femSing = str('femSing');
        draft.mascPlural = str('mascPlural');
        draft.femPlural = str('femPlural');
        return draft;
      },
    );
  }
  return { type: entry.type, translations };
}

const isEnglish = (lang: Lang) => lang === 'en';

/** The fields that matter for a type and language (others are kept but ignored). */
function relevantValues(t: TranslationDraft, type: EditableType, lang: Lang): string[] {
  switch (type) {
    case 'expression':
      return [t.text];
    case 'noun':
      return isEnglish(lang)
        ? [t.text, t.plural]
        : [t.text, t.article, ...(t.hasPlural ? [t.plural, t.pluralArticle] : [])];
    case 'adjective':
      return isEnglish(lang) ? [t.text] : [t.text, t.femSing, t.mascPlural, t.femPlural];
  }
}

function isBlank(t: TranslationDraft, type: EditableType, lang: Lang): boolean {
  return relevantValues(t, type, lang).every((value) => value.trim() === '');
}

/** Content shape for one translation, before validation. */
function translationContent(t: TranslationDraft, type: EditableType, lang: Lang) {
  switch (type) {
    case 'expression':
      return { text: t.text };
    case 'noun':
      if (isEnglish(lang))
        return t.plural.trim() ? { text: t.text, plural: t.plural } : { text: t.text };
      return {
        text: t.text,
        article: t.article,
        gender: t.gender || undefined,
        ...(t.hasPlural ? { plural: t.plural, pluralArticle: t.pluralArticle } : {}),
      };
    case 'adjective':
      return isEnglish(lang)
        ? { text: t.text }
        : {
            mascSing: t.text,
            femSing: t.femSing,
            mascPlural: t.mascPlural,
            femPlural: t.femPlural,
          };
  }
}

/** Rows kept per language (blank rows are dropped), with their index in the draft. */
function keptRows(draft: EntryDraft, lang: Lang) {
  return draft.translations[lang]
    .map((t, index) => ({ t, index }))
    .filter(({ t }) => !isBlank(t, draft.type, lang));
}

function toRawContent(draft: EntryDraft) {
  const translations: Record<string, unknown[]> = {};
  for (const lang of LANGS) {
    translations[lang] = keptRows(draft, lang).map(({ t }) =>
      translationContent(t, draft.type, lang),
    );
  }
  return { type: draft.type, translations };
}

/** Stable representation of what the draft would save: used to detect unsaved changes. */
export function draftSignature(draft: EntryDraft): string {
  return JSON.stringify(toRawContent(draft));
}

export type DraftValidation =
  { ok: true; content: EntryContent } | { ok: false; errors: DraftErrors };

/** Validates with the shared Zod schema and maps its issues to form fields. */
export function validateDraft(draft: EntryDraft): DraftValidation {
  const result = entryContentSchema.safeParse(toRawContent(draft));
  if (result.success) return { ok: true, content: result.data };

  const errors: DraftErrors = {};
  for (const issue of result.error.issues) {
    const [, lang, row, field] = issue.path;
    if (typeof lang !== 'string' || !(LANGS as readonly string[]).includes(lang)) continue;
    if (row === undefined) {
      errors[lang] = 'missingLanguage';
      continue;
    }
    const draftIndex = keptRows(draft, lang as Lang)[Number(row)]?.index;
    if (draftIndex === undefined) continue;
    const draftField = field === 'mascSing' ? 'text' : String(field ?? 'text');
    const code: ErrorCode =
      draftField === 'gender' ? 'gender' : issue.code === 'custom' ? 'pluralArticle' : 'required';
    errors[`${lang}.${String(draftIndex)}.${draftField}`] ??= code;
  }
  return { ok: false, errors };
}
