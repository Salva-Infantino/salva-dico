import { useCallback, useEffect, useReducer, useRef, useState, type MouseEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { Icon } from '../../components/Icon.tsx';
import { LangBadge } from '../../components/LangBadge.tsx';
import { SpeakButton } from '../../components/SpeakButton.tsx';
import { useEntries } from '../../data/EntriesContext.ts';
import { displayedHeadwords, headwords } from '../../domain/forms.ts';
import {
  quizReducer,
  quizSettingsSchema,
  selectCards,
  startQuiz,
  type QuizSettings,
} from '../../domain/quiz.ts';
import { prefersReducedMotion } from '../../hooks/motion.ts';
import { useSpeech } from '../../hooks/useSpeech.ts';
import { fr } from '../../i18n/fr.ts';
import { QuizScore } from './QuizScore.tsx';
import { SwipeCard, type SwipeDirection } from './SwipeCard.tsx';

/** Matches the `.swipe-card` transition. */
const EXIT_MS = 200;

/** The session only exists in memory: reloading the page goes back to the settings. */
export function QuizSessionPage() {
  const location = useLocation();
  const parsed = quizSettingsSchema.safeParse(
    (location.state as { settings?: unknown } | null)?.settings,
  );
  if (!parsed.success) return <Navigate to="/quiz" replace />;
  return <QuizSession settings={parsed.data} />;
}

/** Keeps a mouse click from moving the focus, so Space keeps flipping every card. */
const keepFocus = (event: MouseEvent) => {
  event.preventDefault();
};

function QuizSession({ settings }: { settings: QuizSettings }) {
  const entriesState = useEntries();
  // The cards are drawn once, when the session starts.
  const [quiz, dispatch] = useReducer(quizReducer, null, () =>
    startQuiz(
      selectCards(entriesState.status === 'ready' ? entriesState.entries : [], settings),
      settings.targets.length,
    ),
  );
  const [exit, setExit] = useState<SwipeDirection | null>(null);
  const speech = useSpeech();
  const exitTimer = useRef<number | undefined>(undefined);

  const answer = useCallback(
    (direction: SwipeDirection) => {
      if (exit) return;
      const action = {
        type: 'answer',
        answer: direction === 'right' ? 'known' : 'review',
      } as const;
      if (prefersReducedMotion()) {
        dispatch(action);
        return;
      }
      // The card flies away first, then the next one comes in.
      setExit(direction);
      exitTimer.current = window.setTimeout(() => {
        setExit(null);
        dispatch(action);
      }, EXIT_MS);
    },
    [exit],
  );

  useEffect(
    () => () => {
      window.clearTimeout(exitTimer.current);
    },
    [],
  );

  // Desktop controls: ← / → answer, Space flips every card, 1 / 2 / 3 flip one card.
  useEffect(() => {
    if (quiz.done) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        answer(event.key === 'ArrowRight' ? 'right' : 'left');
      } else if (event.key === ' ') {
        // On a focused button, Space activates that button instead.
        if (target?.closest('button, a')) return;
        event.preventDefault();
        dispatch({ type: 'flipAll' });
      } else if (/^[1-9]$/.test(event.key)) {
        dispatch({ type: 'flip', index: Number(event.key) - 1 });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [answer, quiz.done]);

  if (quiz.done) {
    return (
      <main className="page quiz-end">
        <h1 className="display-title">{fr.quiz.doneTitle}</h1>
        {quiz.total > 0 ? (
          <QuizScore known={quiz.knownFirstTry} total={quiz.total} />
        ) : (
          <p>{fr.quiz.none}</p>
        )}
        <div className="quiz-end-actions">
          <Link className="button" to="/quiz">
            <Icon name="refresh" />
            {fr.quiz.again}
          </Link>
          <Link className="button secondary" to="/">
            {fr.quiz.backHome}
          </Link>
        </div>
      </main>
    );
  }

  const card = quiz.queue[0];
  if (!card) return null;
  const position = quiz.position + 1;
  const progress =
    quiz.pass === 'main'
      ? fr.quiz.progress(position, quiz.passSize)
      : fr.quiz.reviewProgress(position, quiz.passSize);

  return (
    <main className="page quiz-session">
      <h1 className="visually-hidden">{fr.quiz.setupTitle}</h1>
      <header className="quiz-header">
        <Link to="/" className="round-button" aria-label={fr.quiz.quit} title={fr.quiz.quit}>
          <Icon name="close" />
        </Link>
        <progress
          className={quiz.pass === 'review' ? 'review' : undefined}
          value={quiz.position}
          max={quiz.passSize}
          aria-hidden="true"
        />
        <p className="quiz-progress">
          <span aria-hidden="true">
            {position} / {quiz.passSize}
          </span>
          <span className="visually-hidden" aria-live="polite">
            {progress}
          </span>
        </p>
      </header>

      <div className="card-stack">
        <SwipeCard key={`${quiz.pass}-${card.id}`} exit={exit} onSwipe={answer}>
          <section className="quiz-source" aria-label={fr.langs[settings.source]}>
            <div className="quiz-card-top">
              <LangBadge lang={settings.source} />
              <div className="quiz-card-tools">
                <span className="quiz-type">{fr.entryTypes[card.type]}</span>
                <SpeakButton
                  text={headwords(card, settings.source).join(', ')}
                  lang={settings.source}
                  speech={speech}
                />
              </div>
            </div>
            <ul className="quiz-words">
              {displayedHeadwords(card, settings.source).map((word, i) => (
                <li key={i} lang={settings.source}>
                  {word}
                </li>
              ))}
            </ul>
          </section>

          <div className="quiz-targets">
            {settings.targets.map((lang, index) => {
              const flipped = quiz.flipped[index] === true;
              return (
                <button
                  key={lang}
                  type="button"
                  className="quiz-target"
                  aria-pressed={flipped}
                  onMouseDown={keepFocus}
                  onClick={() => {
                    dispatch({ type: 'flip', index });
                  }}
                >
                  <LangBadge lang={lang} />
                  {flipped ? (
                    <span className="quiz-target-words" lang={lang}>
                      {displayedHeadwords(card, lang).join(', ')}
                    </span>
                  ) : (
                    <span className="quiz-target-hidden">{fr.quiz.hidden}</span>
                  )}
                  <kbd className="quiz-key" aria-hidden="true">
                    {index + 1}
                  </kbd>
                </button>
              );
            })}
          </div>
        </SwipeCard>
      </div>

      <button
        type="button"
        className="text-button flip-all"
        onMouseDown={keepFocus}
        onClick={() => {
          dispatch({ type: 'flipAll' });
        }}
      >
        {fr.quiz.flipAll}
      </button>

      <div className="quiz-actions">
        <button
          type="button"
          className="quiz-answer review"
          onMouseDown={keepFocus}
          onClick={() => {
            answer('left');
          }}
        >
          <Icon name="arrowLeft" />
          {fr.quiz.review}
        </button>
        <button
          type="button"
          className="quiz-answer known"
          onMouseDown={keepFocus}
          onClick={() => {
            answer('right');
          }}
        >
          {fr.quiz.known}
          <Icon name="arrowRight" />
        </button>
      </div>
      <p className="quiz-keyboard-hint muted">{fr.quiz.keyboardHint}</p>
    </main>
  );
}
