import { useEffect, useState } from 'react';
import { scorePercent } from '../../domain/quiz.ts';
import { prefersReducedMotion } from '../../hooks/motion.ts';
import { fr } from '../../i18n/fr.ts';

const DURATION_MS = 1200;
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Counts from 0 to `target` with an ease-out curve; jumps to the end when motion is reduced. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [target]);
  return value;
}

/**
 * End-of-session score: entries known on the first try. A ring fills up while the
 * number counts up. Screen readers get the final score at once.
 */
export function QuizScore({ known, total }: { known: number; total: number }) {
  const percent = scorePercent({ knownFirstTry: known, total });
  const shown = useCountUp(percent);
  const finished = Math.round(shown) === percent;
  const level = percent >= 90 ? 'high' : percent >= 60 ? 'medium' : 'low';

  return (
    <div className={`quiz-score quiz-score-${level}`}>
      <div className="quiz-score-ring" role="img" aria-label={fr.quiz.scoreLabel(percent)}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="quiz-score-track" cx="60" cy="60" r={RADIUS} />
          <circle
            className="quiz-score-progress"
            cx="60"
            cy="60"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - shown / 100)}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <span className={`quiz-score-value${finished ? ' finished' : ''}`} aria-hidden="true">
          {Math.round(shown)}
          <small> %</small>
        </span>
      </div>
      <p className="quiz-score-cheer">{fr.quiz.cheer(percent)}</p>
      <p className="muted">{fr.quiz.score(known, total)}</p>
    </div>
  );
}
