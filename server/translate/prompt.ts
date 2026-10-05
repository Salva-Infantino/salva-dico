import type { EntryType, Lang } from '../../src/domain/languages.ts';

const LANG_NAMES: Record<Lang, string> = {
  fr: 'French',
  en: 'English',
  es: 'Spanish',
  it: 'Italian',
};

/**
 * Linguistic rules of the dictionary (CLAUDE.md, section 5). The JSON schema
 * enforces the structure; these rules enforce the content.
 */
export const SYSTEM_INSTRUCTION = `You fill a personal 4-language vocabulary dictionary: French (fr), English (en), Spanish (es), Italian (it).
Return one entry that translates the given word or expression into all four languages, following the JSON schema exactly.

Language varieties:
- Spanish is the variety of Spain: use vosotros forms and peninsular vocabulary (coche, ordenador, móvil).
- English is American English: American spelling and vocabulary (color, apartment, gotten).

Translations:
- Every language needs at least one translation. Include the given word itself in its own language.
- Add several translations in a language only when their meanings genuinely differ. No near-synonyms, no example sentences.
- Words (nouns, adjectives, adverbs, expressions…) are given in their dictionary form only: no article, singular, masculine (garçon, not le garçon; grand, not grande). No gender, plural or feminine forms.

Verbs:
- "text" is the infinitive as written in a dictionary, including the reflexive pronoun (se lever, levantarse, alzarsi); set "reflexive": true for reflexive verbs.
- Conjugated forms never include subject pronouns (vais, not je vais), but keep reflexive pronouns (me lève).
- The 6 persons are always in this order: 1st singular, 2nd singular, 3rd singular, 1st plural, 2nd plural, 3rd plural.
- Compound past tenses show agreement where relevant: French "suis allé(e)", "sommes allé(e)s", "êtes allé(e)(s)"; Italian "sono andato/a", "siamo andati/e".
- Only the tenses of the schema. No literary tenses: no French passé simple, no Italian passato remoto.
- Imperative: 3 persons (2nd singular, 1st plural, 2nd plural), affirmative and negative, both written in full (es negative uses the subjunctive: no vayas; it 2nd singular negative uses the infinitive: non andare). No formal imperative.
- French and Italian give the auxiliary of compound tenses (avoir / être, avere / essere).
- English verbs give base, pastSimple, pastParticiple (American: gotten) and whether the verb is irregular.`;

export function entryPrompt(sourceLang: Lang, text: string, type: EntryType): string {
  return `${LANG_NAMES[sourceLang]} ${type}: "${text}"`;
}

export function typePrompt(sourceLang: Lang, text: string): string {
  return `Classify this ${LANG_NAMES[sourceLang]} dictionary item as "verb" (a verb in the infinitive, possibly reflexive) or "word" (anything else: noun, adjective, adverb, expression…).
Item: "${text}"`;
}

export function conjugationPrompt(
  lang: Lang,
  verb: string,
  englishMeaning: string | undefined,
  reflexive: boolean,
): string {
  const meaning = englishMeaning ? ` (${englishMeaning})` : '';
  const reflexiveNote = reflexive
    ? ' It is reflexive: keep the reflexive pronoun in every form.'
    : '';
  return `Conjugation of the ${LANG_NAMES[lang]} verb "${verb}"${meaning}.${reflexiveNote}`;
}
