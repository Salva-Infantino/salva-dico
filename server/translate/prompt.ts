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
- Add several translations in a language only when their meanings genuinely differ, or for the masculine and feminine of a person noun (ami / amie). No near-synonyms, no example sentences.
- Use the dictionary form: singular nouns, masculine singular adjectives, infinitive verbs.

Nouns:
- "text" is the bare noun, without article. "article" is the singular definite article (fr: le, la, l'; es: el, la; it: il, lo, la, l'), "pluralArticle" the plural one (fr: les; es: los, las; it: i, gli, le). Feminine Spanish nouns with stressed a- take "el" (el agua) and keep gender "f".
- "gender" is "m" or "f". Omit "plural" and "pluralArticle" only for nouns without a plural.
- English nouns have no gender or article; give "plural" only when it is irregular (mouse -> mice).

Adjectives:
- French, Spanish and Italian adjectives have 4 forms (mascSing, femSing, mascPlural, femPlural); identical forms are allowed (grande, grande, grandi, grandi). English adjectives have a single "text".

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
  return `Classify this ${LANG_NAMES[sourceLang]} dictionary item as one of: noun, verb, adjective, expression (any multi-word phrase that is not a single noun, verb or adjective).
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
