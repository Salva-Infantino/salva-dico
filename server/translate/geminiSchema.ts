import { z } from 'zod';
import { ENTRY_TYPES, type EntryType, type RomanceLang } from '../../src/domain/languages.ts';
import {
  conjugationEsSchema,
  conjugationFrSchema,
  conjugationItSchema,
  entryContentVariants,
  verbTranslationEnSchema,
  verbTranslationEsSchema,
  verbTranslationFrSchema,
  verbTranslationItSchema,
} from '../../src/domain/schemas.ts';

/**
 * Gemini's `responseJsonSchema` supports a subset of JSON Schema. Zod's output uses
 * a few unsupported keywords: `const` becomes a one-value `enum`, and keywords the
 * API ignores or rejects are dropped. The response is validated with Zod anyway.
 */
const DROPPED_KEYWORDS = new Set(['$schema', 'minLength', 'maxLength', 'pattern', 'default']);

export function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node === null || typeof node !== 'object') return node;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (DROPPED_KEYWORDS.has(key)) continue;
    if (key === 'const') {
      result.enum = [value];
      continue;
    }
    result[key] = toGeminiSchema(value);
  }
  return result;
}

/** Schema of a complete entry of one type (kept small: one type per request). */
export function entryJsonSchema(type: EntryType): unknown {
  return toGeminiSchema(z.toJSONSchema(entryContentVariants[type]));
}

/** Schema of the type detection request, used when the user did not choose a type. */
export const typeJsonSchema = {
  type: 'object',
  properties: { type: { type: 'string', enum: [...ENTRY_TYPES] } },
  required: ['type'],
};

/**
 * Verbs are generated in several requests: asking for three full conjugation tables
 * at once trips Gemini's recitation filter (the answer comes back empty). First the
 * entry without French, Spanish and Italian conjugations, then one request per
 * conjugation.
 */
export const verbBaseSchema = z.object({
  type: z.literal('verb'),
  translations: z.object({
    fr: z.array(verbTranslationFrSchema.omit({ conjugation: true })).min(1),
    en: z.array(verbTranslationEnSchema).min(1),
    es: z.array(verbTranslationEsSchema.omit({ conjugation: true })).min(1),
    it: z.array(verbTranslationItSchema.omit({ conjugation: true })).min(1),
  }),
});

export const CONJUGATION_SCHEMAS = {
  fr: conjugationFrSchema,
  es: conjugationEsSchema,
  it: conjugationItSchema,
} as const;

export function verbBaseJsonSchema(): unknown {
  return toGeminiSchema(z.toJSONSchema(verbBaseSchema));
}

export function conjugationJsonSchema(lang: RomanceLang): unknown {
  return toGeminiSchema(z.toJSONSchema(CONJUGATION_SCHEMAS[lang]));
}
