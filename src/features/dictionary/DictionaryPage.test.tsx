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
      '/entries/aller',
      '/entries/arbre',
      '/entries/garcon',
      '/entries/grand',
    ]);
  });

  it('shows the 4 languages with flags in each row', () => {
    renderWithEntries(entries);
    const row = screen.getByRole('link', { name: /ragazzo/ });
    for (const lang of ['Français', 'Anglais', 'Espagnol', 'Italien']) {
      expect(within(row).getByRole('img', { name: lang })).toBeInTheDocument();
    }
    expect(row).toHaveTextContent('le garçon');
    expect(row).toHaveTextContent('boy');
    expect(row).toHaveAttribute('href', '/entries/garcon');
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
    renderWithEntries(entries, '/?q=went&types=verb');
    expect(screen.getByRole('searchbox')).toHaveValue('went');
    expect(screen.getByRole('button', { name: fr.entryTypes.verb })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('filters by type', async () => {
    renderWithEntries(entries);
    await userEvent.click(screen.getByRole('button', { name: fr.entryTypes.adjective }));

    expect(await screen.findByText(fr.home.resultCount(1))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /grande/ })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/?types=adjective');
  });

  it('restricts the search to the selected languages', async () => {
    renderWithEntries(entries, '/?q=grand');
    expect(await screen.findByText(fr.home.resultCount(1))).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Anglais/ }));
    expect(await screen.findByText(fr.home.noResults)).toBeInTheDocument();
  });

  it('says when the dictionary is empty', () => {
    renderWithEntries([]);
    expect(screen.getByText(fr.home.empty)).toBeInTheDocument();
  });

  it('renders long lists progressively', async () => {
    const many = Array.from({ length: 150 }, (_, i) =>
      makeEntry(
        {
          type: 'expression',
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
