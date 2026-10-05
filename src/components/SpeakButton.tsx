import type { Lang } from '../domain/languages.ts';
import type { Speech } from '../hooks/useSpeech.ts';
import { fr } from '../i18n/fr.ts';

/** Reads a word aloud. Renders nothing when no voice speaks the language. */
export function SpeakButton({ text, lang, speech }: { text: string; lang: Lang; speech: Speech }) {
  if (!speech.canSpeak(lang)) return null;
  return (
    <button
      type="button"
      className="speak-button"
      aria-label={fr.entry.speak(text)}
      title={fr.entry.speak(text)}
      onClick={() => {
        speech.speak(text, lang);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path
          d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
