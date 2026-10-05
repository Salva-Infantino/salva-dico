import { z } from 'zod';

/**
 * Zod schemas are the single source of truth for the data model: TS types are
 * inferred from them, and the same schemas validate Firestore documents, JSON
 * imports and AI responses.
 */

export const CURRENT_SCHEMA_VERSION = 1;

const word = z.string().trim().min(1);

const persons = z.tuple([word, word, word, word, word, word]);
const threePersons = z.tuple([word, word, word]);

/** Present imperative, persons 2sg, 1pl, 2pl. Negatives are stored, not derived. */
const imperativeSchema = z.object({
  affirmative: threePersons,
  negative: threePersons,
});

// --- Conjugations -----------------------------------------------------------

export const conjugationFrSchema = z.object({
  auxiliary: z.enum(['avoir', 'être']),
  present: persons,
  passeCompose: persons,
  imparfait: persons,
  futurSimple: persons,
  conditionnelPresent: persons,
  imperatifPresent: imperativeSchema,
});

export const conjugationItSchema = z.object({
  auxiliary: z.enum(['avere', 'essere']),
  presente: persons,
  passatoProssimo: persons,
  imperfetto: persons,
  futuroSemplice: persons,
  condizionalePresente: persons,
  imperativo: imperativeSchema,
});

export const conjugationEsSchema = z.object({
  presente: persons,
  preteritoPerfecto: persons,
  preteritoIndefinido: persons,
  preteritoImperfecto: persons,
  futuroSimple: persons,
  condicional: persons,
  imperativo: imperativeSchema,
});

export const conjugationEnSchema = z.object({
  base: word,
  pastSimple: word,
  pastParticiple: word,
  irregular: z.boolean(),
});

// --- Translations, by entry type --------------------------------------------

/**
 * A word or an expression, in its dictionary form: no article, gender or plural
 * (ex. FR `grand`, IT `ragazzo`, EN `please`).
 */
export const wordTranslationSchema = z.object({ text: word });

/** `text` is the infinitive as displayed, including the reflexive form (se lever, alzarsi). */
export const verbTranslationFrSchema = z.object({
  text: word,
  reflexive: z.boolean().optional(),
  conjugation: conjugationFrSchema,
});

export const verbTranslationItSchema = z.object({
  text: word,
  reflexive: z.boolean().optional(),
  conjugation: conjugationItSchema,
});

export const verbTranslationEsSchema = z.object({
  text: word,
  reflexive: z.boolean().optional(),
  conjugation: conjugationEsSchema,
});

export const verbTranslationEnSchema = z.object({
  text: word,
  conjugation: conjugationEnSchema,
});

// --- Entry content (what the user or the AI produces) ------------------------

/** All four languages are required, each with at least one translation of equal weight. */
function translationsSchema<
  Fr extends z.ZodType,
  En extends z.ZodType,
  Es extends z.ZodType,
  It extends z.ZodType,
>(fr: Fr, en: En, es: Es, it: It) {
  return z.object({
    fr: z.array(fr).min(1),
    en: z.array(en).min(1),
    es: z.array(es).min(1),
    it: z.array(it).min(1),
  });
}

const wordContent = {
  type: z.literal('word'),
  translations: translationsSchema(
    wordTranslationSchema,
    wordTranslationSchema,
    wordTranslationSchema,
    wordTranslationSchema,
  ),
};

const verbContent = {
  type: z.literal('verb'),
  translations: translationsSchema(
    verbTranslationFrSchema,
    verbTranslationEnSchema,
    verbTranslationEsSchema,
    verbTranslationItSchema,
  ),
};

/** One content schema per entry type (the AI function generates one type at a time). */
export const entryContentVariants = {
  word: z.object(wordContent),
  verb: z.object(verbContent),
};

/** The editable part of an entry: used by the entry form, the AI function and the review screen. */
export const entryContentSchema = z.discriminatedUnion('type', [
  entryContentVariants.word,
  entryContentVariants.verb,
]);

// --- Stored entry ---------------------------------------------------------------

/**
 * Timestamps are epoch milliseconds in the domain. Conversion from/to Firestore
 * `Timestamp` happens in the Firebase layer, which keeps this module framework-free.
 */
const entryMeta = {
  id: z.string().min(1),
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  mastered: z.boolean(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  /** Soft delete (tombstone), so deletions propagate through the delta sync query. */
  deleted: z.boolean(),
};

export const entrySchema = z.discriminatedUnion('type', [
  z.object({ ...entryMeta, ...wordContent }),
  z.object({ ...entryMeta, ...verbContent }),
]);

export type ConjugationFR = z.infer<typeof conjugationFrSchema>;
export type ConjugationIT = z.infer<typeof conjugationItSchema>;
export type ConjugationES = z.infer<typeof conjugationEsSchema>;
export type ConjugationEN = z.infer<typeof conjugationEnSchema>;
export type Imperative = z.infer<typeof imperativeSchema>;

export type EntryContent = z.infer<typeof entryContentSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type EntryOfType<T extends Entry['type']> = Extract<Entry, { type: T }>;
