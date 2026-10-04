import type { EntryContent } from '../src/domain/schemas.ts';
import { ALL_CONTENTS } from '../src/test/fixtures.ts';

type Noun = Extract<EntryContent, { type: 'noun' }>['translations'];
type Adjective = Extract<EntryContent, { type: 'adjective' }>['translations'];

const noun = (translations: Noun): EntryContent => ({ type: 'noun', translations });
const adjective = (translations: Adjective): EntryContent => ({ type: 'adjective', translations });
const expression = (fr: string[], en: string[], es: string[], it: string[]): EntryContent => ({
  type: 'expression',
  translations: {
    fr: fr.map((text) => ({ text })),
    en: en.map((text) => ({ text })),
    es: es.map((text) => ({ text })),
    it: it.map((text) => ({ text })),
  },
});

/**
 * Realistic development data, chosen to cover edge cases: elided articles, the
 * feminine "el agua", Italian "lo" / "gli", irregular English plurals, uncountable
 * nouns, several translations per language, identical adjective forms, punctuation.
 */
const EXTRA_CONTENTS: EntryContent[] = [
  noun({
    fr: [{ text: 'maison', gender: 'f', article: 'la', plural: 'maisons', pluralArticle: 'les' }],
    en: [{ text: 'house' }],
    es: [{ text: 'casa', gender: 'f', article: 'la', plural: 'casas', pluralArticle: 'las' }],
    it: [{ text: 'casa', gender: 'f', article: 'la', plural: 'case', pluralArticle: 'le' }],
  }),
  noun({
    fr: [{ text: 'voiture', gender: 'f', article: 'la', plural: 'voitures', pluralArticle: 'les' }],
    en: [{ text: 'car' }],
    es: [{ text: 'coche', gender: 'm', article: 'el', plural: 'coches', pluralArticle: 'los' }],
    it: [{ text: 'macchina', gender: 'f', article: 'la', plural: 'macchine', pluralArticle: 'le' }],
  }),
  noun({
    fr: [
      {
        text: 'ordinateur',
        gender: 'm',
        article: "l'",
        plural: 'ordinateurs',
        pluralArticle: 'les',
      },
    ],
    en: [{ text: 'computer' }],
    es: [
      {
        text: 'ordenador',
        gender: 'm',
        article: 'el',
        plural: 'ordenadores',
        pluralArticle: 'los',
      },
    ],
    it: [{ text: 'computer', gender: 'm', article: 'il', plural: 'computer', pluralArticle: 'i' }],
  }),
  noun({
    fr: [{ text: 'livre', gender: 'm', article: 'le', plural: 'livres', pluralArticle: 'les' }],
    en: [{ text: 'book' }],
    es: [{ text: 'libro', gender: 'm', article: 'el', plural: 'libros', pluralArticle: 'los' }],
    it: [{ text: 'libro', gender: 'm', article: 'il', plural: 'libri', pluralArticle: 'i' }],
  }),
  noun({
    fr: [{ text: 'eau', gender: 'f', article: "l'", plural: 'eaux', pluralArticle: 'les' }],
    en: [{ text: 'water' }],
    es: [{ text: 'agua', gender: 'f', article: 'el', plural: 'aguas', pluralArticle: 'las' }],
    it: [{ text: 'acqua', gender: 'f', article: "l'", plural: 'acque', pluralArticle: 'le' }],
  }),
  noun({
    fr: [
      { text: 'ami', gender: 'm', article: "l'", plural: 'amis', pluralArticle: 'les' },
      { text: 'amie', gender: 'f', article: "l'", plural: 'amies', pluralArticle: 'les' },
    ],
    en: [{ text: 'friend' }],
    es: [
      { text: 'amigo', gender: 'm', article: 'el', plural: 'amigos', pluralArticle: 'los' },
      { text: 'amiga', gender: 'f', article: 'la', plural: 'amigas', pluralArticle: 'las' },
    ],
    it: [
      { text: 'amico', gender: 'm', article: "l'", plural: 'amici', pluralArticle: 'gli' },
      { text: 'amica', gender: 'f', article: "l'", plural: 'amiche', pluralArticle: 'le' },
    ],
  }),
  noun({
    fr: [{ text: 'pomme', gender: 'f', article: 'la', plural: 'pommes', pluralArticle: 'les' }],
    en: [{ text: 'apple' }],
    es: [{ text: 'manzana', gender: 'f', article: 'la', plural: 'manzanas', pluralArticle: 'las' }],
    it: [{ text: 'mela', gender: 'f', article: 'la', plural: 'mele', pluralArticle: 'le' }],
  }),
  noun({
    fr: [
      {
        text: 'appartement',
        gender: 'm',
        article: "l'",
        plural: 'appartements',
        pluralArticle: 'les',
      },
    ],
    en: [{ text: 'apartment' }],
    es: [{ text: 'piso', gender: 'm', article: 'el', plural: 'pisos', pluralArticle: 'los' }],
    it: [
      {
        text: 'appartamento',
        gender: 'm',
        article: "l'",
        plural: 'appartamenti',
        pluralArticle: 'gli',
      },
    ],
  }),
  noun({
    fr: [{ text: 'enfant', gender: 'm', article: "l'", plural: 'enfants', pluralArticle: 'les' }],
    en: [{ text: 'child', plural: 'children' }],
    es: [{ text: 'niño', gender: 'm', article: 'el', plural: 'niños', pluralArticle: 'los' }],
    it: [{ text: 'bambino', gender: 'm', article: 'il', plural: 'bambini', pluralArticle: 'i' }],
  }),
  noun({
    fr: [{ text: 'pied', gender: 'm', article: 'le', plural: 'pieds', pluralArticle: 'les' }],
    en: [{ text: 'foot', plural: 'feet' }],
    es: [{ text: 'pie', gender: 'm', article: 'el', plural: 'pies', pluralArticle: 'los' }],
    it: [{ text: 'piede', gender: 'm', article: 'il', plural: 'piedi', pluralArticle: 'i' }],
  }),
  noun({
    fr: [{ text: 'patience', gender: 'f', article: 'la' }],
    en: [{ text: 'patience' }],
    es: [{ text: 'paciencia', gender: 'f', article: 'la' }],
    it: [{ text: 'pazienza', gender: 'f', article: 'la' }],
  }),
  noun({
    fr: [
      {
        text: 'sac à dos',
        gender: 'm',
        article: 'le',
        plural: 'sacs à dos',
        pluralArticle: 'les',
      },
    ],
    en: [{ text: 'backpack' }],
    es: [{ text: 'mochila', gender: 'f', article: 'la', plural: 'mochilas', pluralArticle: 'las' }],
    it: [{ text: 'zaino', gender: 'm', article: 'lo', plural: 'zaini', pluralArticle: 'gli' }],
  }),
  adjective({
    fr: [{ mascSing: 'petit', femSing: 'petite', mascPlural: 'petits', femPlural: 'petites' }],
    en: [{ text: 'small' }, { text: 'little' }],
    es: [
      { mascSing: 'pequeño', femSing: 'pequeña', mascPlural: 'pequeños', femPlural: 'pequeñas' },
    ],
    it: [{ mascSing: 'piccolo', femSing: 'piccola', mascPlural: 'piccoli', femPlural: 'piccole' }],
  }),
  adjective({
    fr: [
      { mascSing: 'heureux', femSing: 'heureuse', mascPlural: 'heureux', femPlural: 'heureuses' },
    ],
    en: [{ text: 'happy' }],
    es: [{ mascSing: 'feliz', femSing: 'feliz', mascPlural: 'felices', femPlural: 'felices' }],
    it: [{ mascSing: 'felice', femSing: 'felice', mascPlural: 'felici', femPlural: 'felici' }],
  }),
  adjective({
    fr: [{ mascSing: 'rouge', femSing: 'rouge', mascPlural: 'rouges', femPlural: 'rouges' }],
    en: [{ text: 'red' }],
    es: [{ mascSing: 'rojo', femSing: 'roja', mascPlural: 'rojos', femPlural: 'rojas' }],
    it: [{ mascSing: 'rosso', femSing: 'rossa', mascPlural: 'rossi', femPlural: 'rosse' }],
  }),
  expression(
    ['bonjour'],
    ['hello', 'good morning'],
    ['hola', 'buenos días'],
    ['buongiorno', 'ciao'],
  ),
  expression(['merci beaucoup'], ['thank you very much'], ['muchas gracias'], ['grazie mille']),
  expression(['ça ne fait rien'], ["it doesn't matter"], ['no pasa nada'], ['non fa niente']),
  expression(['comment ça va ?'], ['how are you?'], ['¿qué tal?'], ['come stai?']),
];

export const SEED_CONTENTS: readonly EntryContent[] = [...ALL_CONTENTS, ...EXTRA_CONTENTS];

/** Headwords (FR) of seeded entries marked as mastered. */
export const MASTERED_FR = new Set(['maison', 'bonjour']);

/** Synthetic entries for performance checks (`--bulk <count>`). */
export function syntheticContent(index: number): EntryContent {
  const n = String(index).padStart(5, '0');
  return expression([`mot ${n}`], [`word ${n}`], [`palabra ${n}`], [`parola ${n}`]);
}
