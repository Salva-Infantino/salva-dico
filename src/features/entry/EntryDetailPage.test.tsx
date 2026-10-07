import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import {
  allerContent,
  arbreContent,
  grandContent,
  makeEntry,
  sourisContent,
  sVousPlaitContent,
} from '../../test/fixtures.ts';
import { plain } from '../../test/text.ts';
import { renderWithEntries } from '../../test/renderWithEntries.tsx';

const entries: Entry[] = [
  makeEntry(arbreContent, { id: 'arbre', mastered: true }),
  makeEntry(sourisContent, { id: 'souris' }),
  makeEntry(grandContent, { id: 'grand' }),
  makeEntry(allerContent, { id: 'aller' }),
  makeEntry(sVousPlaitContent, { id: 'svp' }),
  makeEntry(arbreContent, { id: 'gone', deleted: true }),
];

function card(lang: string) {
  return screen.getByRole('region', { name: lang });
}

describe('EntryDetailPage', () => {
  it('shows the 4 languages on one screen, French first, each with its badge', () => {
    const { container } = renderWithEntries(entries, '/entries/arbre');
    for (const lang of ['Français', 'Anglais', 'Espagnol', 'Italien']) {
      expect(card(lang)).toBeInTheDocument();
    }
    expect(container.querySelectorAll('.lang-badge')).toHaveLength(4);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Arbre$/);
    expect(card('Français')).toHaveTextContent(
      plain(fr.entry.kind('Français', fr.entryTypes.word)),
    );
  });

  it('shows the word of each language', () => {
    renderWithEntries(entries, '/entries/arbre');
    expect(within(card('Italien')).getByRole('listitem')).toHaveTextContent(/^Albero$/);
    expect(within(card('Anglais')).getByText('Tree')).toHaveClass('headword');
  });

  it('puts the language shown in the dictionary first', () => {
    renderWithEntries(entries, '/entries/arbre?lang=it');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Albero$/);
    expect(within(card('Français')).getByRole('listitem')).toHaveTextContent(/^Arbre$/);
  });

  it('shows infinitives, and English past forms', () => {
    renderWithEntries(entries, '/entries/aller');
    expect(within(card('Espagnol')).getByRole('listitem')).toHaveTextContent('Ir');
    expect(within(card('Anglais')).getByText('went · gone · irrégulier')).toHaveClass('details');
  });

  it('lists every translation of a language with equal weight', () => {
    renderWithEntries(entries, '/entries/svp?lang=en');
    const items = within(card('Français')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(["S'il vous plaît", "S'il te plaît"]);
  });

  it('handles unknown and deleted entries', () => {
    renderWithEntries(entries, '/entries/gone');
    expect(screen.getByRole('heading', { name: fr.entry.notFound })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: fr.entry.back })).toHaveAttribute('href', '/');
  });

  it('goes back to the search it came from', async () => {
    renderWithEntries(entries, '/?q=arbre');
    await userEvent.click(screen.getByRole('link', { name: /Albero/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/entries/arbre?lang=fr');

    await userEvent.click(screen.getByRole('button', { name: fr.entry.back }));
    expect(screen.getByTestId('location')).toHaveTextContent('/?q=arbre');
  });
});

describe('EntryDetailPage actions', () => {
  it('toggles the mastered switch', async () => {
    const { actions } = renderWithEntries(entries, '/entries/arbre');
    const toggle = screen.getByRole('switch', { name: fr.entry.mastered });
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    expect(actions.setMastered).toHaveBeenCalledWith('arbre', false);
  });

  it('links to the edit form', () => {
    renderWithEntries(entries, '/entries/arbre');
    expect(screen.getByRole('link', { name: fr.entry.edit })).toHaveAttribute(
      'href',
      '/entries/arbre/edit',
    );
  });

  it('links each infinitive to its own conjugation', () => {
    renderWithEntries(entries, '/entries/aller');
    expect(screen.getByRole('link', { name: fr.entry.edit })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: fr.conjugation.open('andare') })).toHaveAttribute(
      'href',
      '/entries/aller/conjugation/it/0',
    );
    expect(screen.getByRole('link', { name: fr.conjugation.open('go') })).toHaveAttribute(
      'href',
      '/entries/aller/conjugation/en/0',
    );
  });

  it('deletes after confirmation and goes back', async () => {
    const { actions } = renderWithEntries(entries, '/entries/souris');
    await userEvent.click(screen.getByRole('button', { name: fr.entry.delete }));

    const dialog = screen.getByRole('dialog', { name: fr.entry.deleteTitle });
    // The safe choice is focused first.
    expect(within(dialog).getByRole('button', { name: fr.dialog.cancel })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole('button', { name: fr.entry.delete }));

    expect(actions.remove).toHaveBeenCalledWith('souris');
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    expect(screen.getByRole('status')).toHaveTextContent(fr.notifications.deleted);
  });

  it('keeps the entry when the deletion is cancelled', async () => {
    const { actions } = renderWithEntries(entries, '/entries/souris');
    await userEvent.click(screen.getByRole('button', { name: fr.entry.delete }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: fr.dialog.cancel }),
    );
    expect(actions.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('EntryDetailPage — text-to-speech', () => {
  /** A Web Speech API stand-in with the given voices. */
  function installSpeech(voices: { lang: string; localService: boolean }[]) {
    const speech = {
      getVoices: vi.fn(() => voices),
      speak: vi.fn<(utterance: { text: string; lang: string }) => void>(),
      cancel: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('speechSynthesis', speech);
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        lang = '';
        voice: unknown = null;
        rate = 1;
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    return speech;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads a word aloud with a voice of its language', async () => {
    const speech = installSpeech([
      { lang: 'en-GB', localService: true },
      { lang: 'en-US', localService: true },
    ]);
    renderWithEntries(entries, '/entries/arbre');
    await userEvent.click(
      within(card('Anglais')).getByRole('button', { name: fr.entry.speak('tree') }),
    );
    expect(speech.cancel).toHaveBeenCalled();
    expect(speech.speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'tree', lang: 'en-US' }),
    );
  });

  it('hides the button when no voice speaks the language', () => {
    installSpeech([{ lang: 'en-US', localService: true }]);
    renderWithEntries(entries, '/entries/arbre');
    expect(within(card('Italien')).queryByRole('button', { name: /Écouter/ })).toBeNull();
  });

  it('hides every button without the Web Speech API', () => {
    renderWithEntries(entries, '/entries/arbre');
    expect(screen.queryByRole('button', { name: /Écouter/ })).toBeNull();
  });
});
