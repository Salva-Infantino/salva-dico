import type { Lang } from '../domain/languages.ts';
import type { Speech } from '../hooks/useSpeech.ts';
import { fr } from '../i18n/fr.ts';
import { Icon } from './Icon.tsx';

/**
 * Reads a word aloud, in a round button tinted with the language's color.
 * Renders nothing when no voice speaks the language.
 */
export function SpeakButton({
  text,
  lang,
  speech,
  large = false,
}: {
  text: string;
  lang: Lang;
  speech: Speech;
  large?: boolean;
}) {
  if (!speech.canSpeak(lang)) return null;
  return (
    <button
      type="button"
      className={`speak-button lang-${lang}${large ? ' large' : ''}`}
      aria-label={fr.entry.speak(text)}
      title={fr.entry.speak(text)}
      onClick={() => {
        speech.speak(text, lang);
      }}
    >
      <Icon name="speaker" />
    </button>
  );
}
