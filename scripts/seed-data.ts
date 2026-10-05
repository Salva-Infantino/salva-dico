import type { EntryContent } from '../src/domain/schemas.ts';
import { ALL_CONTENTS } from '../src/test/fixtures.ts';

const word = (fr: string[], en: string[], es: string[], it: string[]): EntryContent => ({
  type: 'word',
  translations: {
    fr: fr.map((text) => ({ text })),
    en: en.map((text) => ({ text })),
    es: es.map((text) => ({ text })),
    it: it.map((text) => ({ text })),
  },
});

/**
 * Realistic development data, chosen to cover edge cases: words identical in several
 * languages, multi-word expressions, several translations per language, punctuation.
 */
const EXTRA_CONTENTS: EntryContent[] = [
  word(['maison'], ['house'], ['casa'], ['casa']),
  word(['voiture'], ['car'], ['coche'], ['macchina']),
  word(['ordinateur'], ['computer'], ['ordenador'], ['computer']),
  word(['livre'], ['book'], ['libro'], ['libro']),
  word(['eau'], ['water'], ['agua'], ['acqua']),
  word(['ami'], ['friend'], ['amigo'], ['amico']),
  word(['pomme'], ['apple'], ['manzana'], ['mela']),
  word(['appartement'], ['apartment'], ['piso'], ['appartamento']),
  word(['enfant'], ['child'], ['niño'], ['bambino']),
  word(['patience'], ['patience'], ['paciencia'], ['pazienza']),
  word(['sac à dos'], ['backpack'], ['mochila'], ['zaino']),
  word(['petit'], ['small', 'little'], ['pequeño'], ['piccolo']),
  word(['heureux'], ['happy'], ['feliz'], ['felice']),
  word(['rouge'], ['red'], ['rojo'], ['rosso']),
  word(['bonjour'], ['hello', 'good morning'], ['hola', 'buenos días'], ['buongiorno', 'ciao']),
  word(['merci beaucoup'], ['thank you very much'], ['muchas gracias'], ['grazie mille']),
  word(['ça ne fait rien'], ["it doesn't matter"], ['no pasa nada'], ['non fa niente']),
  word(['comment ça va ?'], ['how are you?'], ['¿qué tal?'], ['come stai?']),
];

export const SEED_CONTENTS: readonly EntryContent[] = [...ALL_CONTENTS, ...EXTRA_CONTENTS];

/** Headwords (FR) of seeded entries marked as mastered. */
export const MASTERED_FR = new Set(['maison', 'bonjour']);

/** Synthetic entries for performance checks (`--bulk <count>`). */
export function syntheticContent(index: number): EntryContent {
  const n = String(index).padStart(5, '0');
  return word([`mot ${n}`], [`word ${n}`], [`palabra ${n}`], [`parola ${n}`]);
}
