import { Link } from 'react-router';
import { LangBadge } from '../../components/LangBadge.tsx';
import { SpeakButton } from '../../components/SpeakButton.tsx';
import { useEntryActions } from '../../data/EntryActionsContext.ts';
import { headwords } from '../../domain/forms.ts';
import type { Lang } from '../../domain/languages.ts';
import type { Entry } from '../../domain/schemas.ts';
import { useSpeech } from '../../hooks/useSpeech.ts';
import { fr } from '../../i18n/fr.ts';

/**
 * The entry in its main language, large, tinted with the language's color: the
 * words (verbs link to their conjugation), a speak button and the mastered switch.
 */
export function EntryHero({
  entry,
  lang,
  heading: Heading,
  compact = false,
}: {
  entry: Entry;
  lang: Lang;
  heading: 'h1' | 'h2';
  compact?: boolean;
}) {
  const actions = useEntryActions();
  const speech = useSpeech();
  const words = headwords(entry, lang);
  const labelId = `mastered-label-${entry.id}`;
  const hintId = `mastered-hint-${entry.id}`;

  return (
    <section
      className={`hero lang-${lang}${compact ? ' compact' : ''}`}
      aria-label={fr.langs[lang]}
    >
      <p className="hero-kind">
        <LangBadge lang={lang} decorative />
        {fr.entry.kind(fr.langs[lang], fr.entryTypes[entry.type])}
      </p>
      <div className="hero-main">
        <Heading className="hero-words" lang={lang}>
          {words.map((word, i) => (
            <span key={i} className="hero-word">
              {word}
            </span>
          ))}
        </Heading>
        <SpeakButton text={words.join(', ')} lang={lang} speech={speech} large />
      </div>
      {entry.type === 'verb' && (
        <p className="hero-links">
          {words.map((word, i) => (
            <Link
              key={i}
              className="hero-link"
              to={`/entries/${entry.id}/conjugation/${lang}/${String(i)}`}
              aria-label={fr.conjugation.open(word)}
            >
              {words.length > 1 ? `${fr.conjugation.title} · ${word}` : fr.conjugation.title}
            </Link>
          ))}
        </p>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={entry.mastered}
        aria-labelledby={labelId}
        aria-describedby={compact ? undefined : hintId}
        className="switch-row"
        onClick={() => {
          actions.setMastered(entry.id, !entry.mastered);
        }}
      >
        <span className="switch-text">
          <strong id={labelId}>{fr.entry.mastered}</strong>
          {!compact && (
            <span id={hintId} className="muted">
              {fr.entry.masteredHint}
            </span>
          )}
        </span>
        <span className="switch-track" aria-hidden="true" />
      </button>
    </section>
  );
}
