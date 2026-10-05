import { z } from 'zod';
import { ENTRY_TYPES, LANGS, type Lang } from './languages.ts';
import type { Entry } from './schemas.ts';

// --- Settings -------------------------------------------------------------------

export const QUIZ_ORDERS = ['random', 'recent'] as const;
export const QUIZ_COUNTS = [10, 20, 50, 'all'] as const;

/** Also validates the settings remembered in localStorage (they may come from an older version). */
export const quizSettingsSchema = z
  .object({
    source: z.enum(LANGS),
    /** Languages to guess: one to three, never the source. */
    targets: z.array(z.enum(LANGS)).min(1),
    types: z.array(z.enum(ENTRY_TYPES)).min(1),
    excludeMastered: z.boolean(),
    order: z.enum(QUIZ_ORDERS),
    count: z.union([z.literal(10), z.literal(20), z.literal(50), z.literal('all')]),
  })
  .refine((s) => !s.targets.includes(s.source), { path: ['targets'] });

export type QuizSettings = z.infer<typeof quizSettingsSchema>;
export type QuizCount = QuizSettings['count'];

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  source: 'fr',
  targets: ['en', 'es', 'it'],
  types: [...ENTRY_TYPES],
  excludeMastered: true,
  order: 'random',
  count: 20,
};

/** Targets after choosing a new source: the source leaves the targets, which never end up empty. */
export function targetsForSource(source: Lang, targets: readonly Lang[]): Lang[] {
  const kept = LANGS.filter((lang) => lang !== source && targets.includes(lang));
  return kept.length > 0 ? kept : LANGS.filter((lang) => lang !== source);
}

// --- Card selection ------------------------------------------------------------------

/** Entries matching the filters (type, mastered), deleted ones excluded. */
export function eligibleEntries(entries: readonly Entry[], settings: QuizSettings): Entry[] {
  return entries.filter(
    (entry) =>
      !entry.deleted &&
      settings.types.includes(entry.type) &&
      !(settings.excludeMastered && entry.mastered),
  );
}

/**
 * The cards of a session, in play order. `random` returns a number in [0, 1)
 * (injectable for deterministic tests).
 */
export function selectCards(
  entries: readonly Entry[],
  settings: QuizSettings,
  random: () => number = Math.random,
): Entry[] {
  const eligible = eligibleEntries(entries, settings);
  const ordered =
    settings.order === 'random'
      ? shuffle(eligible, random)
      : // Most recently added first; Array.prototype.sort is stable for equal dates.
        [...eligible].sort((a, b) => b.createdAt - a.createdAt);
  return settings.count === 'all' ? ordered : ordered.slice(0, settings.count);
}

/** Fisher–Yates shuffle, on a copy. */
function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

// --- Session ----------------------------------------------------------------------------

export type QuizAnswer = 'known' | 'review';

/**
 * A session plays every card once ("main" pass), then the cards answered "à réviser"
 * once more ("review" pass), then ends. Knowledge is global per entry: the answer
 * covers every target language of the card.
 */
export interface QuizState {
  pass: 'main' | 'review';
  /** Cards left in the current pass; the first one is on screen. */
  queue: readonly Entry[];
  /** Cards answered "à réviser" during the main pass. */
  reviewPile: readonly Entry[];
  /** Position of the current card in its pass (0-based) and size of that pass. */
  position: number;
  passSize: number;
  /** Cards of the session, and cards known on the first try (the score). */
  total: number;
  knownFirstTry: number;
  /** Face-up target cards of the current card, by target index. */
  flipped: readonly boolean[];
  done: boolean;
}

export type QuizAction =
  { type: 'flip'; index: number } | { type: 'flipAll' } | { type: 'answer'; answer: QuizAnswer };

export function startQuiz(cards: readonly Entry[], targetCount: number): QuizState {
  return {
    pass: 'main',
    queue: cards,
    reviewPile: [],
    position: 0,
    passSize: cards.length,
    total: cards.length,
    knownFirstTry: 0,
    flipped: Array<boolean>(targetCount).fill(false),
    done: cards.length === 0,
  };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  if (state.done) return state;
  switch (action.type) {
    case 'flip':
      if (action.index < 0 || action.index >= state.flipped.length) return state;
      return { ...state, flipped: state.flipped.map((f, i) => (i === action.index ? !f : f)) };

    case 'flipAll': {
      // Shows every card, or hides them all when they are already face up.
      const allUp = state.flipped.every(Boolean);
      return { ...state, flipped: state.flipped.map(() => !allUp) };
    }

    case 'answer':
      return nextCard(state, action.answer);
  }
}

function nextCard(state: QuizState, answer: QuizAnswer): QuizState {
  const [current, ...rest] = state.queue;
  if (!current) return state;
  const flipped = state.flipped.map(() => false);

  let { knownFirstTry, reviewPile } = state;
  if (state.pass === 'main') {
    if (answer === 'known') knownFirstTry += 1;
    else reviewPile = [...reviewPile, current];
  }

  if (rest.length > 0) {
    return {
      ...state,
      queue: rest,
      position: state.position + 1,
      knownFirstTry,
      reviewPile,
      flipped,
    };
  }
  if (state.pass === 'main' && reviewPile.length > 0) {
    return {
      ...state,
      pass: 'review',
      queue: reviewPile,
      position: 0,
      passSize: reviewPile.length,
      knownFirstTry,
      reviewPile,
      flipped,
    };
  }
  return { ...state, queue: [], knownFirstTry, reviewPile, flipped, done: true };
}

/** Score in percent, rounded (0 for an empty session). */
export function scorePercent(state: Pick<QuizState, 'knownFirstTry' | 'total'>): number {
  return state.total === 0 ? 0 : Math.round((state.knownFirstTry / state.total) * 100);
}
