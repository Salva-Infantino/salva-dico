import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
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
  it('shows the 4 languages on one screen, each with its flag', () => {
    const { container } = renderWithEntries(entries, '/entries/arbre');
    for (const lang of ['Français', 'Anglais', 'Espagnol', 'Italien']) {
      expect(card(lang)).toBeInTheDocument();
    }
    expect(container.querySelectorAll('.lang-card svg.flag')).toHaveLength(4);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(fr.entryTypes.noun);
  });

  it('shows noun articles, plural and gender as discreet details', () => {
    renderWithEntries(entries, '/entries/arbre');
    expect(within(card('Français')).getByRole('listitem')).toHaveTextContent(
      "l'arbre · les arbres · m.",
    );
    expect(within(card('Italien')).getByRole('listitem')).toHaveTextContent(
      "l'albero · gli alberi · m.",
    );
    expect(within(card('Français')).getByText('arbre')).toHaveClass('headword');
  });

  it('shows irregular English plurals', () => {
    renderWithEntries(entries, '/entries/souris');
    expect(within(card('Anglais')).getByRole('listitem')).toHaveTextContent('mouse · pl. mice');
  });

  it('collapses identical adjective forms', () => {
    renderWithEntries(entries, '/entries/grand');
    expect(within(card('Français')).getByRole('listitem')).toHaveTextContent(
      'grand · grande · grands · grandes',
    );
    expect(within(card('Italien')).getByRole('listitem')).toHaveTextContent('grande · grandi');
  });

  it('shows infinitives, and English past forms', () => {
    renderWithEntries(entries, '/entries/aller');
    expect(within(card('Espagnol')).getByRole('listitem')).toHaveTextContent('ir');
    expect(within(card('Anglais')).getByRole('listitem')).toHaveTextContent(
      'go · went · gone · irrégulier',
    );
  });

  it('lists every translation of a language with equal weight', () => {
    renderWithEntries(entries, '/entries/svp');
    const items = within(card('Français')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(["s'il vous plaît", "s'il te plaît"]);
  });

  it('handles unknown and deleted entries', () => {
    renderWithEntries(entries, '/entries/gone');
    expect(screen.getByRole('heading', { name: fr.entry.notFound })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: fr.entry.back })).toHaveAttribute('href', '/');
  });

  it('goes back to the search it came from', async () => {
    renderWithEntries(entries, '/?q=arbre');
    await userEvent.click(screen.getByRole('link', { name: /albero/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/entries/arbre');

    await userEvent.click(screen.getByRole('button', { name: `← ${fr.entry.back}` }));
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
