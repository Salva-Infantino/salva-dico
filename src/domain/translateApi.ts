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

/**
 * Which free-tier limit stopped the AI: per minute (retry after a delay) or per day
 * (reset at midnight Pacific time). Absent when the provider did not say.
 */
export const quotaInfoSchema = z.object({
  scope: z.enum(['minute', 'day']),
  retryAfterSeconds: z.number().int().nonnegative().optional(),
});
export type QuotaInfo = z.infer<typeof quotaInfoSchema>;

export const translateResponseSchema = z.union([
  z.object({ content: entryContentSchema }),
  z.object({ error: z.enum(TRANSLATE_ERRORS), quota: quotaInfoSchema.optional() }),
]);
export type TranslateResponse = z.infer<typeof translateResponseSchema>;
