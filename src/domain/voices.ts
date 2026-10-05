import type { Lang } from './languages.ts';

/** The fields of `SpeechSynthesisVoice` used to choose a voice (pure, testable). */
export interface VoiceLike {
  lang: string;
  localService: boolean;
}

/** Varieties of the dictionary content: Spain Spanish, American English. */
const PREFERRED_TAGS: Record<Lang, string> = {
  fr: 'fr-fr',
  en: 'en-us',
  es: 'es-es',
  it: 'it-it',
};

/** BCP 47 tags come as "en-US", "en_US" or "en-us" depending on the platform. */
function normalizeTag(tag: string): string {
  return tag.replace('_', '-').toLowerCase();
}

/**
 * Best voice for a language, or null when there is none (the speak button is then
 * hidden). The expected variety wins over other varieties of the language, and a
 * voice installed on the device wins over an online one, which fails offline.
 */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], lang: Lang): V | null {
  let best: V | null = null;
  let bestScore = 0;
  for (const voice of voices) {
    const tag = normalizeTag(voice.lang);
    if (tag !== lang && !tag.startsWith(`${lang}-`)) continue;
    const score = (tag === PREFERRED_TAGS[lang] ? 2 : 1) + (voice.localService ? 0.5 : 0);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}
