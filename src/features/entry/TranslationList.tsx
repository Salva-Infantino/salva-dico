import { Link } from 'react-router';
import type { Lang } from '../../domain/languages.ts';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';

/**
 * All translations of one language, with equal weight. The main word stands out;
 * English verb forms are shown discreetly.
 */
export function TranslationList({ entry, lang }: { entry: Entry; lang: Lang }) {
  return <ul className="translation-list">{items(entry, lang)}</ul>;
}

function items(entry: Entry, lang: Lang) {
  switch (entry.type) {
    case 'word':
      return entry.translations[lang].map((t, i) => (
        <li key={i}>
          <span className="headword">{t.text}</span>
        </li>
      ));

    case 'verb':
      // Each infinitive opens the conjugation of that language (never compared across languages).
      return entry.translations[lang].map((t, i) => (
        <li key={i}>
          <Link
            className="headword"
            to={`/entries/${entry.id}/conjugation/${lang}/${String(i)}`}
            aria-label={fr.conjugation.open(t.text)}
          >
            {t.text}
          </Link>
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
  return <span className="grammar details"> · {shown.join(' · ')}</span>;
}
