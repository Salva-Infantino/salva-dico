import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import { allerContent, arbreContent, garconContent, makeEntry } from '../../test/fixtures.ts';
import { renderWithEntries } from '../../test/renderWithEntries.tsx';

const entries: Entry[] = [
  makeEntry(garconContent, { id: 'garcon' }),
  makeEntry(arbreContent, { id: 'arbre' }),
  makeEntry(allerContent, { id: 'aller' }),
];

/** Item at `index`, failing the test when it is missing. */
function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`No item at index ${String(index)}`);
  return item;
}

const section = (lang: string) => screen.getByRole('group', { name: lang });
const save = () => userEvent.click(screen.getByRole('button', { name: fr.editor.save }));

async function fillExpression(values: Record<string, string>) {
  await userEvent.click(screen.getByRole('radio', { name: fr.entryTypes.expression }));
  for (const [lang, text] of Object.entries(values)) {
    const input = within(section(lang)).getByRole('textbox', { name: fr.editor.fields.expression });
    await userEvent.clear(input);
    await userEvent.type(input, text);
  }
}

describe('EntryEditorPage — new entry', () => {
  it('starts from the language and word given in the URL', () => {
    renderWithEntries(entries, '/entries/new?lang=it&text=ragazzino');
    const word = within(section('Italien')).getByRole('textbox', { name: fr.editor.fields.word });
    expect(word).toHaveValue('ragazzino');
    expect(word).toHaveFocus();
    // The start language comes first.
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('class'))).toContain(
      'lang-fieldset',
    );
    expect(screen.getAllByRole('group', { name: /Italien|Français|Anglais|Espagnol/ })[0]).toBe(
      section('Italien'),
    );
  });

  it('derives the gender and plural article from the article (lo → m., gli)', async () => {
    renderWithEntries(entries, '/entries/new?lang=it');
    const italian = within(section('Italien'));
    await userEvent.selectOptions(
      italian.getByRole('combobox', { name: fr.editor.fields.article }),
      'lo',
    );
    expect(italian.getByRole('radio', { name: fr.editor.fields.masculine })).toBeChecked();
    expect(italian.getByRole('combobox', { name: fr.editor.fields.pluralArticle })).toHaveValue(
      'gli',
    );
  });

  it('pre-fills the other adjective forms', async () => {
    renderWithEntries(entries, '/entries/new');
    await userEvent.click(screen.getByRole('radio', { name: fr.entryTypes.adjective }));
    const spanish = within(section('Espagnol'));
    await userEvent.type(
      spanish.getByRole('textbox', { name: fr.editor.fields.mascSing }),
      'pequeño',
    );
    expect(spanish.getByRole('textbox', { name: fr.editor.fields.femPlural })).toHaveValue(
      'pequeñas',
    );
  });

  it('shows errors next to the fields and focuses the first one', async () => {
    const { actions } = renderWithEntries(entries, '/entries/new');
    await save();

    expect(screen.getByRole('alert')).toHaveTextContent(fr.editor.errors.summary);
    expect(within(section('Français')).getByText(fr.editor.errors.missingLanguage)).toBeVisible();
    expect(actions.create).not.toHaveBeenCalled();

    await userEvent.type(
      within(section('Français')).getByRole('textbox', { name: fr.editor.fields.word }),
      'chat',
    );
    await save();
    await waitFor(() => {
      expect(
        within(section('Français')).getByRole('combobox', { name: fr.editor.fields.article }),
      ).toHaveFocus();
    });
  });

  it('saves a valid entry and opens it', async () => {
    const { actions } = renderWithEntries(entries, '/entries/new');
    await fillExpression({
      Français: 'à bientôt',
      Anglais: 'see you soon',
      Espagnol: 'hasta pronto',
      Italien: 'a presto',
    });
    await save();

    expect(actions.create).toHaveBeenCalledWith({
      type: 'expression',
      translations: {
        fr: [{ text: 'à bientôt' }],
        en: [{ text: 'see you soon' }],
        es: [{ text: 'hasta pronto' }],
        it: [{ text: 'a presto' }],
      },
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/entries/new-id');
    expect(screen.getByRole('status')).toHaveTextContent(fr.notifications.added);
  });

  it('can add and remove translations in a language', async () => {
    const { actions } = renderWithEntries(entries, '/entries/new');
    await fillExpression({ Français: 'salut', Anglais: 'hi', Espagnol: 'hola', Italien: 'ciao' });
    await userEvent.click(
      within(section('Anglais')).getByRole('button', { name: fr.editor.addTranslation }),
    );
    const english = within(section('Anglais'));
    const inputs = english.getAllByRole('textbox', { name: fr.editor.fields.expression });
    await userEvent.type(nth(inputs, 1), 'hey');
    await userEvent.click(
      within(section('Italien')).getByRole('button', { name: fr.editor.addTranslation }),
    );
    const removeButtons = within(section('Italien')).getAllByRole('button', {
      name: fr.editor.removeTranslation,
    });
    await userEvent.click(nth(removeButtons, 1));
    await save();

    const content = actions.create.mock.calls[0]?.[0];
    expect(content?.translations.en).toEqual([{ text: 'hi' }, { text: 'hey' }]);
    expect(content?.translations.it).toEqual([{ text: 'ciao' }]);
  });

  it('warns about a duplicate and asks before saving it', async () => {
    const { actions } = renderWithEntries(entries, '/entries/new');
    await fillExpression({ Français: 'le Garçon', Anglais: 'x', Espagnol: 'x', Italien: 'x' });

    const warning = await within(section('Français')).findByText(/existe déjà en français/);
    expect(within(warning).getByRole('link', { name: fr.editor.openExisting })).toHaveAttribute(
      'href',
      '/entries/garcon',
    );

    await save();
    expect(actions.create).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: fr.editor.duplicateTitle });
    await userEvent.click(within(dialog).getByRole('button', { name: fr.editor.saveAnyway }));
    expect(actions.create).toHaveBeenCalledOnce();
  });

  it('asks before leaving with unsaved changes', async () => {
    renderWithEntries(entries, '/entries/new');
    await userEvent.type(
      within(section('Français')).getByRole('textbox', { name: fr.editor.fields.word }),
      'chien',
    );
    await userEvent.click(screen.getByRole('button', { name: fr.editor.cancel }));

    const dialog = screen.getByRole('dialog', { name: fr.editor.leaveTitle });
    await userEvent.click(within(dialog).getByRole('button', { name: fr.editor.stay }));
    expect(screen.getByTestId('location')).toHaveTextContent('/entries/new');

    await userEvent.click(screen.getByRole('button', { name: fr.editor.cancel }));
    await userEvent.click(
      within(screen.getByRole('dialog', { name: fr.editor.leaveTitle })).getByRole('button', {
        name: fr.editor.leave,
      }),
    );
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('leaves without asking when nothing changed', async () => {
    renderWithEntries(entries, '/entries/new');
    await userEvent.click(screen.getByRole('button', { name: fr.editor.cancel }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });
});

describe('EntryEditorPage — existing entry', () => {
  it('edits an entry without reporting it as its own duplicate', async () => {
    const { actions } = renderWithEntries(entries, '/entries/arbre/edit');
    const english = within(section('Anglais')).getByRole('textbox', {
      name: fr.editor.fields.word,
    });
    expect(english).toHaveValue('tree');
    expect(screen.queryByText(/existe déjà/)).not.toBeInTheDocument();

    await userEvent.clear(english);
    await userEvent.type(english, 'shrub');
    await save();

    expect(actions.update).toHaveBeenCalledWith('arbre', {
      ...arbreContent,
      translations: { ...arbreContent.translations, en: [{ text: 'shrub' }] },
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/entries/arbre');
  });

  it('does not edit verbs yet', () => {
    renderWithEntries(entries, '/entries/aller/edit');
    expect(screen.getByText(fr.entry.verbEditLater)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: fr.editor.save })).not.toBeInTheDocument();
  });

  it('handles an unknown entry', () => {
    renderWithEntries(entries, '/entries/nope/edit');
    expect(screen.getByRole('heading', { name: fr.entry.notFound })).toBeInTheDocument();
  });
});
