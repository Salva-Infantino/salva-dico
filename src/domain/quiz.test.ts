import { describe, expect, it } from 'vitest';
import {
  allerContent,
  arbreContent,
  garconContent,
  grandContent,
  makeEntry,
  seLeverContent,
} from '../test/fixtures.ts';
import {
  DEFAULT_QUIZ_SETTINGS,
  eligibleEntries,
  quizReducer,
  quizSettingsSchema,
  scorePercent,
  selectCards,
  startQuiz,
  targetsForSource,
  type QuizAction,
  type QuizSettings,
  type QuizState,
} from './quiz.ts';
import type { Entry } from './schemas.ts';

const entries: Entry[] = [
  makeEntry(garconContent, { id: 'garcon', createdAt: 1 }),
  makeEntry(arbreContent, { id: 'arbre', createdAt: 4, mastered: true }),
  makeEntry(grandContent, { id: 'grand', createdAt: 3 }),
  makeEntry(allerContent, { id: 'aller', createdAt: 2 }),
  makeEntry(seLeverContent, { id: 'gone', createdAt: 5, deleted: true }),
];

const settings = (patch: Partial<QuizSettings> = {}): QuizSettings => ({
  ...DEFAULT_QUIZ_SETTINGS,
  ...patch,
});
const ids = (list: readonly Entry[]) => list.map((entry) => entry.id);

describe('quizSettingsSchema', () => {
  it('accepts the defaults', () => {
    expect(quizSettingsSchema.safeParse(DEFAULT_QUIZ_SETTINGS).success).toBe(true);
  });

  it('rejects no target, the source as a target, no type and unknown counts', () => {
    for (const patch of [
      { targets: [] },
      { targets: ['fr', 'en'] },
      { types: [] },
      { count: 15 },
    ]) {
      expect(quizSettingsSchema.safeParse({ ...DEFAULT_QUIZ_SETTINGS, ...patch }).success).toBe(
        false,
      );
    }
  });
});

describe('targetsForSource', () => {
  it('removes the new source from the targets', () => {
    expect(targetsForSource('es', ['en', 'es'])).toEqual(['en']);
  });

  it('falls back to every other language when no target is left', () => {
    expect(targetsForSource('es', ['es'])).toEqual(['fr', 'en', 'it']);
  });
});

describe('eligibleEntries', () => {
  it('skips deleted and mastered entries, and filters by type', () => {
    expect(ids(eligibleEntries(entries, settings()))).toEqual(['garcon', 'grand', 'aller']);
    expect(ids(eligibleEntries(entries, settings({ excludeMastered: false })))).toContain('arbre');
    expect(ids(eligibleEntries(entries, settings({ types: ['verb'] })))).toEqual(['aller']);
  });
});

describe('selectCards', () => {
  it('orders by most recently added first', () => {
    const cards = selectCards(entries, settings({ order: 'recent', excludeMastered: false }));
    expect(ids(cards)).toEqual(['arbre', 'grand', 'aller', 'garcon']);
  });

  it('shuffles with the given random source', () => {
    // Always 0: each element swaps with the first one (Fisher–Yates).
    expect(ids(selectCards(entries, settings(), () => 0))).toEqual(['grand', 'aller', 'garcon']);
    const cards = selectCards(entries, settings(), Math.random);
    expect(ids(cards).sort()).toEqual(['aller', 'garcon', 'grand']);
  });

  it('keeps the requested number of cards', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      makeEntry(garconContent, { id: `e${String(i)}` }),
    );
    expect(selectCards(many, settings({ count: 10 }))).toHaveLength(10);
    expect(selectCards(many, settings({ count: 50 }))).toHaveLength(30);
    expect(selectCards(many, settings({ count: 'all' }))).toHaveLength(30);
  });
});

function play(state: QuizState, ...actions: QuizAction[]): QuizState {
  return actions.reduce(quizReducer, state);
}
const known: QuizAction = { type: 'answer', answer: 'known' };
const review: QuizAction = { type: 'answer', answer: 'review' };

describe('quiz session', () => {
  const cards = entries.slice(0, 3);

  it('starts on the first card, all target cards face down', () => {
    const state = startQuiz(cards, 2);
    expect(state.queue[0]?.id).toBe('garcon');
    expect(state.flipped).toEqual([false, false]);
    expect(state).toMatchObject({ pass: 'main', position: 0, passSize: 3, done: false });
  });

  it('flips one card or all of them, and hides them all when all are face up', () => {
    const start = startQuiz(cards, 3);
    expect(play(start, { type: 'flip', index: 1 }).flipped).toEqual([false, true, false]);
    expect(play(start, { type: 'flip', index: 1 }, { type: 'flip', index: 1 }).flipped).toEqual([
      false,
      false,
      false,
    ]);
    expect(play(start, { type: 'flip', index: 5 })).toBe(start);
    const allUp = play(start, { type: 'flip', index: 0 }, { type: 'flipAll' });
    expect(allUp.flipped).toEqual([true, true, true]);
    expect(play(allUp, { type: 'flipAll' }).flipped).toEqual([false, false, false]);
  });

  it('turns the next card face down after an answer', () => {
    const state = play(startQuiz(cards, 2), { type: 'flipAll' }, known);
    expect(state.queue[0]?.id).toBe('arbre');
    expect(state.flipped).toEqual([false, false]);
    expect(state.position).toBe(1);
  });

  it('replays the "à réviser" cards once at the end, then ends', () => {
    let state = play(startQuiz(cards, 1), review, known, review);
    expect(state.pass).toBe('review');
    expect(ids(state.queue)).toEqual(['garcon', 'grand']);
    expect(state).toMatchObject({ position: 0, passSize: 2, knownFirstTry: 1 });

    // A card still unknown in the review pass does not come back again.
    state = play(state, review, known);
    expect(state.done).toBe(true);
    expect(state.knownFirstTry).toBe(1);
    expect(play(state, known)).toBe(state);
  });

  it('ends right after the main pass when every card is known', () => {
    const state = play(startQuiz(cards, 1), known, known, known);
    expect(state.done).toBe(true);
    expect(scorePercent(state)).toBe(100);
  });

  it('computes the score on the first try only', () => {
    expect(scorePercent({ knownFirstTry: 2, total: 3 })).toBe(67);
    expect(scorePercent({ knownFirstTry: 0, total: 0 })).toBe(0);
  });

  it('is done at once without cards', () => {
    expect(startQuiz([], 1).done).toBe(true);
  });
});
