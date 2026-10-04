import { z } from 'zod';
import { ENTRY_TYPES, LANGS } from './languages.ts';
import { entryContentSchema } from './schemas.ts';

/**
 * Contract of POST /api/translate, shared by the Netlify function and the client.
 * The Firebase ID token travels in the Authorization header, not in the body.
 */
export const TRANSLATE_PATH = '/api/translate';

export const translateRequestSchema = z.object({
  sourceLang: z.enum(LANGS),
  text: z.string().trim().min(1).max(100),
  type: z.enum(ENTRY_TYPES).optional(),
});
export type TranslateRequest = z.infer<typeof translateRequestSchema>;

export const TRANSLATE_ERRORS = [
  'bad_request',
  'unauthorized',
  'forbidden',
  'quota',
  'timeout',
  'invalid_output',
  'ai_unavailable',
] as const;
export type TranslateErrorCode = (typeof TRANSLATE_ERRORS)[number];

export const translateResponseSchema = z.union([
  z.object({ content: entryContentSchema }),
  z.object({ error: z.enum(TRANSLATE_ERRORS) }),
]);
export type TranslateResponse = z.infer<typeof translateResponseSchema>;
