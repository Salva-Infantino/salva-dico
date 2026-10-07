import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import { allerContent, garconContent, makeEntry, seLeverContent } from '../../test/fixtures.ts';
import { renderWithEntries } from '../../test/renderWithEntries.tsx';

const entries: Entry[] = [
  makeEntry(allerContent, { id: 'aller' }),
  makeEntry(seLeverContent, { id: 'se-lever' }),
  makeEntry(garconContent, { id: 'garcon' }),
];

const tense = (name: RegExp | string) => screen.getByRole('region', { name });
const forms = (region: HTMLElement) =>
  within(region)
    .getAllByRole('listitem')
    .map((item) => item.textContent);

describe('ConjugationPage', () => {
  it('shows every French tense in order, with elided pronouns', () => {
    renderWithEntries(entries, '/entries/aller/conjugation/fr/0');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('aller');
    expect(screen.getByText(/Auxiliaire/)).toHaveTextContent('Auxiliaire : être');
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'Présent',
      'Passé composé',
      'Imparfait',
      'Futur simple',
      'Conditionnel présent',
      'Impératif présent',
    ]);
    expect(forms(tense('Présent'))).toEqual([
      'je vais',
      'tu vas',
      'il/elle va',
      'nous allons',
      'vous allez',
      'ils/elles vont',
    ]);
    expect(forms(tense('Imparfait'))[0]).toBe("j'allais");
  });

  it('shows native tense names with the French equivalent', () => {
    renderWithEntries(entries, '/entries/aller/conjugation/es/0');
    expect(tense(/^Pretérito indefinido\s*·\s*passé simple$/)).toBeInTheDocument();
    expect(forms(tense(/Pretérito indefinido/))).toEqual([
      'yo fui',
      'tú fuiste',
      'él/ella fue',
      'nosotros fuimos',
      'vosotros fuisteis',
      'ellos/ellas fueron',
    ]);
  });

  it('shows the imperative, affirmative and negative', () => {
    renderWithEntries(entries, '/entries/aller/conjugation/it/0');
    const rows = within(tense(/Imperativo/)).getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual([
      `${fr.conjugation.affirmative}${fr.conjugation.negative}`,
      "(tu)vai (va')non andare",
      '(noi)andiamonon andiamo',
      '(voi)andatenon andate',
    ]);
  });

  it('shows reflexive forms with their pronouns', () => {
    renderWithEntries(entries, '/entries/se-lever/conjugation/fr/0');
    expect(forms(tense('Présent'))[0]).toBe('je me lève');
    expect(forms(tense('Passé composé'))[1]).toBe("tu t'es levé(e)");
  });

  it('shows the English principal parts', () => {
    renderWithEntries(entries, '/entries/aller/conjugation/en/0');
    expect(screen.getByText(fr.conjugation.pastSimple).nextElementSibling).toHaveTextContent(
      'went',
    );
    expect(screen.getByText(fr.grammar.irregular)).toBeInTheDocument();
  });

  it('handles an unknown verb, language or index, and non-verbs', () => {
    for (const path of [
      '/entries/aller/conjugation/de/0',
      '/entries/aller/conjugation/fr/3',
      '/entries/garcon/conjugation/fr/0',
    ]) {
      const { unmount } = renderWithEntries(entries, path);
      expect(screen.getByRole('heading', { name: fr.conjugation.notFound })).toBeInTheDocument();
      unmount();
    }
  });

  it('goes back to the entry, whose back button then returns to the dictionary', async () => {
    renderWithEntries(entries, '/?q=aller');
    await userEvent.click(screen.getByRole('link', { name: /andare/ }));
    await userEvent.click(screen.getByRole('link', { name: fr.conjugation.open('ir') }));
    expect(screen.getByTestId('location')).toHaveTextContent('/entries/aller/conjugation/es/0');

    await userEvent.click(screen.getByRole('button', { name: fr.conjugation.back }));
    expect(screen.getByTestId('location')).toHaveTextContent('/entries/aller?lang=fr');
    await userEvent.click(screen.getByRole('button', { name: fr.entry.back }));
    expect(screen.getByTestId('location')).toHaveTextContent('/?q=aller');
  });

  it('goes to the entry when opened directly', async () => {
    renderWithEntries(entries, '/entries/aller/conjugation/es/0');
    await userEvent.click(screen.getByRole('button', { name: fr.conjugation.back }));
    expect(screen.getByTestId('location')).toHaveTextContent('/entries/aller?lang=es');
  });
});
