import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import {
  allerContent,
  arbreContent,
  garconContent,
  grandContent,
  makeEntry,
} from '../../test/fixtures.ts';
import { renderWithEntries } from '../../test/renderWithEntries.tsx';

const entries: Entry[] = [
  makeEntry(garconContent, { id: 'garcon' }),
  makeEntry(grandContent, { id: 'grand' }),
  makeEntry(allerContent, { id: 'aller' }),
  makeEntry(arbreContent, { id: 'arbre' }),
  makeEntry(garconContent, { id: 'deleted', deleted: true }),
];

function rows(): HTMLElement[] {
  return within(screen.getByRole('list')).getAllByRole('link');
}

describe('DictionaryPage', () => {
  it('lists entries alphabetically (French), without deleted ones', () => {
    renderWithEntries(entries);
    expect(screen.getByText(fr.home.entryCount(4))).toBeInTheDocument();
    expect(rows().map((row) => row.getAttribute('href'))).toEqual([
      '/entries/aller?lang=fr',
      '/entries/arbre?lang=fr',
      '/entries/garcon?lang=fr',
      '/entries/grand?lang=fr',
    ]);
  });

  it('shows the shown language first, then the 3 others with their badges', () => {
    renderWithEntries(entries);
    const row = screen.getByRole('link', { name: /Ragazzo/ });
    expect(row).toHaveTextContent(/^Garçon/);
    for (const lang of ['Anglais', 'Espagnol', 'Italien']) {
      expect(within(row).getByText(lang)).toHaveClass('visually-hidden');
    }
    expect(row).toHaveTextContent('Boy');
    expect(
      within(screen.getByRole('link', { name: /Andare/ })).getByText(fr.home.verbBadge),
    ).toBeInTheDocument();
  });

  it('marks mastered entries', () => {
    renderWithEntries([makeEntry(arbreContent, { id: 'arbre', mastered: true })]);
    expect(
      within(screen.getByRole('link', { name: /Albero/ })).getByRole('img', {
        name: fr.home.mastered,
      }),
    ).toBeInTheDocument();
  });

  it('switches the shown language, which also sets the alphabetical order', async () => {
    renderWithEntries(entries);
    await userEvent.click(screen.getByRole('radio', { name: 'Italien' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/?lang=it');
    // albero, andare, grande, ragazzo
    expect(rows().map((row) => row.textContent.slice(0, 6))).toEqual([
      'Albero',
      'Andare',
      'Grande',
      'Ragazz',
    ]);
    expect(rows()[0]).toHaveAttribute('href', '/entries/arbre?lang=it');
  });

  it('searches the 4 languages and keeps the query in the URL', async () => {
    renderWithEntries(entries);
    await userEvent.type(
      screen.getByRole('searchbox', { name: fr.home.searchLabel }),
      'il ragazzo',
    );

    expect(await screen.findByText(fr.home.resultCount(1))).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
    expect(screen.getByTestId('location')).toHaveTextContent('/?q=il+ragazzo');
  });

  it('restores the search from the URL', () => {
    renderWithEntries(entries, '/?q=went&type=verb&lang=es');
    expect(screen.getByRole('searchbox')).toHaveValue('went');
    expect(screen.getByRole('radio', { name: fr.home.typeFilters.verb })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Espagnol' })).toBeChecked();
  });

  it('filters by type', async () => {
    renderWithEntries(entries);
    await userEvent.click(screen.getByRole('radio', { name: fr.home.typeFilters.verb }));

    expect(await screen.findByText(fr.home.resultCount(1))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Andare/ })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/?type=verb');

    await userEvent.click(screen.getByRole('radio', { name: fr.home.allTypes }));
    expect(await screen.findByText(fr.home.entryCount(4))).toBeInTheDocument();
  });

  it('searches the 4 languages whatever the shown language', async () => {
    renderWithEntries(entries, '/?q=big&lang=it');
    expect(await screen.findByText(fr.home.resultCount(1))).toBeInTheDocument();
    expect(rows()[0]).toHaveTextContent(/^Grande/);
  });

  it('says when the dictionary is empty', () => {
    renderWithEntries([]);
    expect(screen.getByText(fr.home.empty)).toBeInTheDocument();
  });

  it('renders long lists progressively', async () => {
    const many = Array.from({ length: 150 }, (_, i) =>
      makeEntry(
        {
          type: 'word',
          translations: {
            fr: [{ text: `mot ${String(i)}` }],
            en: [{ text: 'x' }],
            es: [{ text: 'x' }],
            it: [{ text: 'x' }],
          },
        },
        { id: `e${String(i)}` },
      ),
    );
    renderWithEntries(many);
    expect(rows()).toHaveLength(100);

    await userEvent.click(screen.getByRole('button', { name: fr.home.showMore(50) }));
    expect(rows()).toHaveLength(150);
  });
});

describe('DictionaryPage — adding entries', () => {
  it('offers to add the searched word when nothing matches', async () => {
    renderWithEntries(entries, '/?lang=it');
    await userEvent.type(screen.getByRole('searchbox'), 'gattino');
    const add = await screen.findByRole('link', { name: fr.home.addQuery('gattino') });
    expect(add).toHaveAttribute('href', '/entries/new?lang=it&text=gattino');
  });

  it('has an add button starting in French by default', () => {
    renderWithEntries(entries);
    expect(screen.getByRole('link', { name: fr.home.add })).toHaveAttribute(
      'href',
      '/entries/new?lang=fr',
    );
  });
});
