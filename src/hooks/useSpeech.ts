import { useCallback, useSyncExternalStore } from 'react';
import type { Lang } from '../domain/languages.ts';
import { pickVoice } from '../domain/voices.ts';

const NO_VOICES: readonly SpeechSynthesisVoice[] = [];
let cachedVoices: readonly SpeechSynthesisVoice[] = NO_VOICES;

function synthesis(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null;
}

// Voices load asynchronously in some browsers (Chrome): `voiceschanged` announces them.
function subscribe(onChange: () => void): () => void {
  const speech = synthesis();
  if (!speech) return () => undefined;
  speech.addEventListener('voiceschanged', onChange);
  return () => {
    speech.removeEventListener('voiceschanged', onChange);
  };
}

/** `getVoices()` returns a new array on every call: keep a stable snapshot while it is unchanged. */
function getVoices(): readonly SpeechSynthesisVoice[] {
  const voices = synthesis()?.getVoices() ?? NO_VOICES;
  const changed =
    voices.length !== cachedVoices.length || voices.some((v, i) => v !== cachedVoices[i]);
  if (changed) cachedVoices = voices;
  return cachedVoices;
}

export interface Speech {
  /** False when no voice speaks the language: the speak button is hidden. */
  canSpeak: (lang: Lang) => boolean;
  speak: (text: string, lang: Lang) => void;
}

/** Text-to-speech with the Web Speech API, using the best voice of each language. */
export function useSpeech(): Speech {
  const voices = useSyncExternalStore(subscribe, getVoices, () => NO_VOICES);

  const canSpeak = useCallback((lang: Lang) => pickVoice(voices, lang) !== null, [voices]);

  const speak = useCallback(
    (text: string, lang: Lang) => {
      const speech = synthesis();
      const voice = pickVoice(voices, lang);
      if (!speech || !voice) return;
      // A new word interrupts the previous one instead of queuing behind it.
      speech.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.9;
      speech.speak(utterance);
    },
    [voices],
  );

  return { canSpeak, speak };
}
