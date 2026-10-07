import { Link } from 'react-router';
import { SpeakButton } from '../../components/SpeakButton.tsx';
import { capitalize } from '../../domain/display.ts';
import type { Lang } from '../../domain/languages.ts';
import type { Entry } from '../../domain/schemas.ts';
import { useSpeech, type Speech } from '../../hooks/useSpeech.ts';
import { fr } from '../../i18n/fr.ts';

/**
 * All translations of one language, with equal weight. The main word stands out;
 * English verb forms are shown discreetly. Each word can be read aloud.
 */
export function TranslationList({ entry, lang }: { entry: Entry; lang: Lang }) {
  const speech = useSpeech();
  return <ul className="translation-list">{items(entry, lang, speech)}</ul>;
}

function items(entry: Entry, lang: Lang, speech: Speech) {
  switch (entry.type) {
    case 'word':
      return entry.translations[lang].map((t, i) => (
        <li key={i}>
          <span className="headword" lang={lang}>
            {capitalize(t.text)}
          </span>
          <SpeakButton text={t.text} lang={lang} speech={speech} />
        </li>
      ));

    case 'verb':
      // Each infinitive opens the conjugation of that language (never compared across languages).
      return entry.translations[lang].map((t, i) => (
        <li key={i}>
          <Link
            className="headword"
            lang={lang}
            to={`/entries/${entry.id}/conjugation/${lang}/${String(i)}`}
            aria-label={fr.conjugation.open(t.text)}
          >
            {capitalize(t.text)}
          </Link>
          <SpeakButton text={t.text} lang={lang} speech={speech} />
          {'pastSimple' in t.conjugation && (
            <Details
              parts={[
                t.conjugation.pastSimple,
                t.conjugation.pastParticiple,
                t.conjugation.irregular ? fr.grammar.irregular : null,
              ]}
            />
          )}
        </li>
      ));
  }
}

function Details({ parts }: { parts: readonly (string | null)[] }) {
  const shown = parts.filter((part): part is string => part !== null);
  if (shown.length === 0) return null;
  // On its own line, under the word and its speak button.
  return <span className="grammar details">{shown.join(fr.common.separator)}</span>;
}
