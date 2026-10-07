import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatResetTime, nextQuotaReset } from '../../domain/quotaReset.ts';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import { allerContent, garconContent, makeEntry } from '../../test/fixtures.ts';
import { renderWithEntries } from '../../test/renderWithEntries.tsx';

const entries: Entry[] = [makeEntry(garconContent, { id: 'garcon' })];
const translateButton = () => screen.getByRole('button', { name: fr.ai.submit });
const wordField = () => screen.getByRole('textbox', { name: fr.ai.word });

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AI mode', () => {
  it('is the default mode, pre-filled from the search', () => {
    renderWithEntries(entries, '/entries/new?lang=it&text=andare');
    expect(screen.getByRole('button', { name: fr.ai.modes.ai })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(wordField()).toHaveValue('andare');
    expect(screen.getByRole('radio', { name: 'Italien' })).toBeChecked();
  });

  it('opens the AI result for review and saves only after validation', async () => {
    const { translate, actions } = renderWithEntries(entries, '/entries/new?lang=it&text=andare', {
      ok: true,
      content: allerContent,
    });
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: fr.ai.type }),
      fr.entryTypes.verb,
    );
    await userEvent.click(translateButton());

    expect(translate).toHaveBeenCalledWith(
      { sourceLang: 'it', text: 'andare', type: 'verb' },
      expect.any(AbortSignal),
    );
    expect(await screen.findByRole('heading', { name: fr.ai.reviewTitle })).toBeInTheDocument();
    const italian = screen.getByRole('group', { name: 'Italien' });
    expect(within(italian).getByRole('textbox', { name: fr.editor.fields.infinitive })).toHaveValue(
      'andare',
    );
    expect(actions.create).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: fr.editor.save }));
    expect(actions.create).toHaveBeenCalledWith(allerContent);
  });

  it('lets the AI detect the type when none is chosen', async () => {
    const { translate } = renderWithEntries(entries, '/entries/new?text=chat');
    await userEvent.click(translateButton());
    expect(translate).toHaveBeenCalledWith(
      { sourceLang: 'fr', text: 'chat' },
      expect.any(AbortSignal),
    );
  });

  it('shows errors in French and keeps the typed word', async () => {
    renderWithEntries(entries, '/entries/new?text=chat', { ok: false, error: 'quota' });
    await userEvent.click(translateButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(fr.ai.errors.quota);
    expect(wordField()).toHaveValue('chat');
    expect(translateButton()).toBeEnabled();
  });

  it('says when to retry after a per-minute limit', async () => {
    renderWithEntries(entries, '/entries/new?text=chat', {
      ok: false,
      error: 'quota',
      quota: { scope: 'minute', retryAfterSeconds: 36 },
    });
    await userEvent.click(translateButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(fr.ai.quota.minute(36));
  });

  it('says when the daily quota resets', async () => {
    renderWithEntries(entries, '/entries/new?text=chat', {
      ok: false,
      error: 'quota',
      quota: { scope: 'day' },
    });
    await userEvent.click(translateButton());
    const time = formatResetTime(nextQuotaReset(new Date()));
    expect(await screen.findByRole('alert')).toHaveTextContent(fr.ai.quota.day(time));
    expect(wordField()).toHaveValue('chat');
  });

  it('warns about an existing word and asks before using the AI', async () => {
    const { translate } = renderWithEntries(entries, '/entries/new');
    await userEvent.type(wordField(), 'le garçon');
    expect(screen.getByText(/existe déjà en français/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: fr.editor.openExisting('garçon', fr.entryTypes.word) }),
    ).toHaveAttribute('href', '/entries/garcon');

    await userEvent.click(translateButton());
    const dialog = screen.getByRole('dialog', { name: fr.editor.duplicateTitle });
    await userEvent.click(within(dialog).getByRole('button', { name: fr.dialog.cancel }));
    expect(translate).not.toHaveBeenCalled();

    await userEvent.click(translateButton());
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: fr.ai.translateAnyway }),
    );
    expect(translate).toHaveBeenCalledOnce();
  });

  it('is disabled offline, with an explanation', () => {
    renderWithEntries(entries, '/entries/new?text=chat');
    setOnline(false);
    expect(translateButton()).toBeDisabled();
    expect(screen.getByText(fr.ai.offline)).toBeInTheDocument();
    setOnline(true);
    expect(translateButton()).toBeEnabled();
  });

  it('keeps the word when switching to manual mode', async () => {
    renderWithEntries(entries, '/entries/new?lang=es');
    await userEvent.type(wordField(), 'perro');
    await userEvent.click(screen.getByRole('button', { name: fr.ai.modes.manual }));
    const spanish = screen.getByRole('group', { name: 'Espagnol' });
    expect(within(spanish).getByRole('textbox', { name: fr.editor.fields.word })).toHaveValue(
      'perro',
    );
  });

  it('goes back to the request from the review, with the same word', async () => {
    renderWithEntries(entries, '/entries/new?lang=it&text=andare', {
      ok: true,
      content: allerContent,
    });
    await userEvent.click(translateButton());
    await screen.findByRole('heading', { name: fr.ai.reviewTitle });
    await userEvent.click(screen.getByRole('button', { name: fr.editor.cancel }));
    expect(wordField()).toHaveValue('andare');
  });

  it('asks before leaving an unsaved AI result', async () => {
    const { router } = renderWithEntries(entries, '/entries/new?lang=it&text=andare', {
      ok: true,
      content: allerContent,
    });
    await userEvent.click(translateButton());
    await screen.findByRole('heading', { name: fr.ai.reviewTitle });
    // Let React run the effects of the review screen (useBlocker registers in one),
    // as a real user could not navigate within the same frame.
    await act(() => Promise.resolve());
    await act(() => router.navigate('/'));
    expect(screen.getByRole('dialog', { name: fr.editor.leaveTitle })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/entries/new');
  });
});
