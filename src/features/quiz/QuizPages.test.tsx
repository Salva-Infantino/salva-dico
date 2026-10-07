import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_QUIZ_SETTINGS, type QuizSettings } from '../../domain/quiz.ts';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import {
  allerContent,
  arbreContent,
  garconContent,
  grandContent,
  makeEntry,
} from '../../test/fixtures.ts';
import { plain } from '../../test/text.ts';
import { renderWithEntries } from '../../test/renderWithEntries.tsx';
import { loadQuizSettings } from './quizSettingsStorage.ts';

const entries: Entry[] = [
  makeEntry(garconContent, { id: 'garcon', createdAt: 3 }),
  makeEntry(arbreContent, { id: 'arbre', createdAt: 2, mastered: true }),
  makeEntry(allerContent, { id: 'aller', createdAt: 1 }),
];

beforeEach(() => {
  localStorage.clear();
});

const startButton = () => screen.getByRole('button', { name: /^Commencer/ });

describe('QuizSetupPage', () => {
  it('counts the available entries live', async () => {
    renderWithEntries(entries, '/quiz');
    // Mastered entries are excluded by default.
    expect(screen.getByText(fr.quiz.available(2))).toBeInTheDocument();
    expect(startButton()).toHaveTextContent(fr.quiz.start(2));

    await userEvent.click(screen.getByRole('switch', { name: fr.quiz.excludeMastered }));
    expect(screen.getByText(fr.quiz.available(3))).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: fr.entryTypes.word }));
    expect(screen.getByText(fr.quiz.available(1))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: fr.entryTypes.verb }));
    expect(screen.getByText(fr.quiz.none)).toBeInTheDocument();
    expect(startButton()).toBeDisabled();
  });

  it('never offers the source language as a target', async () => {
    renderWithEntries(entries, '/quiz');
    const targets = within(screen.getByRole('group', { name: fr.quiz.targets }));
    expect(targets.queryByRole('checkbox', { name: fr.langs.fr })).toBeNull();

    await userEvent.click(screen.getByRole('radio', { name: fr.langs.it }));
    expect(targets.queryByRole('checkbox', { name: fr.langs.it })).toBeNull();
    // French becomes a possible target, the chosen targets stay as they were.
    expect(targets.getByRole('checkbox', { name: fr.langs.fr })).not.toBeChecked();
    expect(targets.getByRole('checkbox', { name: fr.langs.en })).toBeChecked();
  });

  it('requires at least one target language', async () => {
    renderWithEntries(entries, '/quiz');
    for (const lang of ['Anglais', 'Espagnol', 'Italien']) {
      await userEvent.click(screen.getByRole('checkbox', { name: lang }));
    }
    expect(startButton()).toBeDisabled();
  });

  it('remembers the settings of the last quiz', async () => {
    renderWithEntries(entries, '/quiz');
    await userEvent.click(screen.getByRole('radio', { name: fr.langs.es }));
    await userEvent.click(screen.getByRole('radio', { name: '10' }));
    await userEvent.click(startButton());

    expect(screen.getByTestId('location')).toHaveTextContent('/quiz/session');
    expect(loadQuizSettings()).toMatchObject({ source: 'es', count: 10 });
  });
});

/** Starts a session through the setup page, with the given settings remembered. */
async function startSession(settings: Partial<QuizSettings>, list: Entry[] = entries) {
  localStorage.setItem(
    'salva-dico:quiz-settings',
    JSON.stringify({ ...DEFAULT_QUIZ_SETTINGS, order: 'recent', ...settings }),
  );
  const result = renderWithEntries(list, '/quiz');
  await userEvent.click(startButton());
  return result;
}

const source = () => screen.getByRole('region', { name: fr.langs.fr });
const target = (lang: string) => screen.getByRole('button', { name: new RegExp(lang) });

describe('QuizSessionPage', () => {
  it('goes back to the settings without a session (reload)', () => {
    renderWithEntries(entries, '/quiz/session');
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/quiz$/);
  });

  it('shows the source card and face-down target cards', async () => {
    await startSession({ targets: ['en', 'it'] });
    expect(screen.getByText(fr.quiz.progress(1, 2))).toBeInTheDocument();
    expect(within(source()).getByText('Garçon')).toBeInTheDocument();
    expect(target('Anglais')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Boy')).toBeNull();
  });

  it('flips one card or all of them, with the mouse or the keyboard', async () => {
    await startSession({ targets: ['en', 'es', 'it'] });
    await userEvent.click(target('Anglais'));
    expect(target('Anglais')).toHaveTextContent('Boy');
    expect(target('Espagnol')).toHaveAttribute('aria-pressed', 'false');

    await userEvent.keyboard('3');
    expect(target('Italien')).toHaveTextContent('Ragazzo');
    await userEvent.keyboard(' ');
    expect(target('Espagnol')).toHaveTextContent('Chico');

    await userEvent.click(screen.getByRole('button', { name: fr.quiz.flipAll }));
    expect(target('Espagnol')).toHaveAttribute('aria-pressed', 'false');
  });

  it('answers with the buttons and the arrow keys, then replays "à réviser" once', async () => {
    await startSession({ targets: ['en'] });
    // garçon: à réviser, then aller: je connais.
    await userEvent.click(screen.getByRole('button', { name: new RegExp(fr.quiz.review) }));
    expect(within(source()).getByText('Aller')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByText(fr.quiz.reviewProgress(1, 1))).toBeInTheDocument();
    expect(within(source()).getByText('Garçon')).toBeInTheDocument();
    // Still unknown: the card does not come back a third time.
    await userEvent.keyboard('{ArrowLeft}');

    expect(screen.getByRole('heading', { name: fr.quiz.doneTitle })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: fr.quiz.scoreLabel(50) })).toBeInTheDocument();
    expect(screen.getByText(fr.quiz.score(1, 2))).toBeInTheDocument();
    expect(screen.getByText(plain(fr.quiz.cheer(50)))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: fr.quiz.again })).toHaveAttribute('href', '/quiz');
  });

  it('answers with a swipe, and a short drag is not an answer', async () => {
    await startSession({ targets: ['en'] });
    const card = () => {
      const element = source().closest<HTMLElement>('.swipe-card');
      if (!element) throw new Error('Swipe card not found');
      return element;
    };

    const drag = (dx: number) => {
      fireEvent.pointerDown(card(), { pointerId: 1, clientX: 200, clientY: 100, button: 0 });
      fireEvent.pointerMove(card(), { pointerId: 1, clientX: 200 + dx / 2, clientY: 100 });
      fireEvent.pointerMove(card(), { pointerId: 1, clientX: 200 + dx, clientY: 100 });
      fireEvent.pointerUp(card(), { pointerId: 1, clientX: 200 + dx, clientY: 100 });
    };

    drag(30);
    expect(within(source()).getByText('Garçon')).toBeInTheDocument();
    drag(200);
    expect(within(source()).getByText('Aller')).toBeInTheDocument();
    drag(-200);
    expect(screen.getByText(fr.quiz.reviewProgress(1, 1))).toBeInTheDocument();
  });

  it('ends at 100 % when every card is known on the first try', async () => {
    await startSession({ targets: ['en'], types: ['verb'] });
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('img', { name: fr.quiz.scoreLabel(100) })).toBeInTheDocument();
    expect(screen.getByText(plain(fr.quiz.cheer(100)))).toBeInTheDocument();
  });

  it('keeps the arrow keys for the page inside text fields', async () => {
    const list = [makeEntry(grandContent, { id: 'grand' })];
    await startSession({ targets: ['en'] }, list);
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(within(source()).getByText('Grand')).toBeInTheDocument();
    input.remove();
  });
});
