import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildExport } from '../../domain/backup.ts';
import type { Entry } from '../../domain/schemas.ts';
import { fr } from '../../i18n/fr.ts';
import { allerContent, arbreContent, garconContent, makeEntry } from '../../test/fixtures.ts';
import { renderWithEntries } from '../../test/renderWithEntries.tsx';

const entries: Entry[] = [
  makeEntry(garconContent, { id: 'garcon' }),
  makeEntry(allerContent, { id: 'aller' }),
  makeEntry(arbreContent, { id: 'gone', deleted: true }),
];

const importInput = () => screen.getByLabelText(fr.settings.import);
const jsonFile = (value: unknown, name = 'backup.json') =>
  new File([typeof value === 'string' ? value : JSON.stringify(value)], name, {
    type: 'application/json',
  });

describe('SettingsPage', () => {
  describe('export', () => {
    let blobs: Blob[];
    beforeEach(() => {
      blobs = [];
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn((blob: Blob) => {
          blobs.push(blob);
          return 'blob:export';
        }),
        revokeObjectURL: vi.fn(),
      });
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('downloads the live entries as a dated JSON file', async () => {
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
        // jsdom does not download files.
      });
      renderWithEntries(entries, '/settings');
      await userEvent.click(screen.getByRole('button', { name: fr.settings.export(2) }));

      expect(click).toHaveBeenCalledOnce();
      const link = click.mock.contexts[0] as HTMLAnchorElement;
      expect(link.download).toMatch(/^salva-dico-\d{4}-\d{2}-\d{2}\.json$/);
      const [blob] = blobs;
      if (!blob) throw new Error('No file was created');
      const file = JSON.parse(await blob.text()) as ReturnType<typeof buildExport>;
      expect(file.entries.map((entry) => entry.id).sort()).toEqual(['aller', 'garcon']);
    });
  });

  describe('import', () => {
    it('shows a preview, then imports the new entries only', async () => {
      const exported = buildExport(
        [makeEntry(garconContent, { id: 'garcon' }), makeEntry(arbreContent, { id: 'arbre' })],
        new Date(),
      );
      const { actions } = renderWithEntries(entries, '/settings');
      await userEvent.upload(importInput(), jsonFile(exported, 'mon-export.json'));

      const preview = await screen.findByRole('heading', {
        name: fr.settings.previewTitle('mon-export.json'),
      });
      const container = preview.closest<HTMLElement>('.import-preview');
      if (!container) throw new Error('Preview not found');
      const panel = within(container);
      expect(panel.getByText(fr.settings.toImport(1))).toBeInTheDocument();
      expect(panel.getByText(fr.settings.alreadyPresent(1))).toBeInTheDocument();
      // Nothing is written before the confirmation.
      expect(actions.importEntries).not.toHaveBeenCalled();

      await userEvent.click(panel.getByRole('button', { name: fr.settings.confirmImport(1) }));
      expect(actions.importEntries).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'arbre', ...arbreContent }),
      ]);
      expect(screen.getByRole('status')).toHaveTextContent(fr.settings.imported(1));
      expect(screen.queryByRole('heading', { name: /Aperçu/ })).toBeNull();
    });

    it('can be cancelled after the preview', async () => {
      const { actions } = renderWithEntries(entries, '/settings');
      await userEvent.upload(importInput(), jsonFile(buildExport([], new Date())));
      expect(await screen.findByText(fr.settings.toImport(0))).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Importer \d/ })).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: fr.dialog.cancel }));
      expect(screen.queryByText(fr.settings.toImport(0))).toBeNull();
      expect(actions.importEntries).not.toHaveBeenCalled();
    });

    it.each([
      ['not JSON', '{oops', fr.settings.importErrors.not_json],
      ['another JSON file', '{"hello":"world"}', fr.settings.importErrors.not_an_export],
    ])('explains in French why a file is refused (%s)', async (_label, text, message) => {
      renderWithEntries(entries, '/settings');
      await userEvent.upload(importInput(), jsonFile(text));
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
    });

    it('refuses files over 10 MB without reading them', async () => {
      renderWithEntries(entries, '/settings');
      const file = jsonFile('{}');
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
      const text = vi.spyOn(file, 'text');
      await userEvent.upload(importInput(), file);
      expect(await screen.findByRole('alert')).toHaveTextContent(
        fr.settings.importErrors.too_large,
      );
      expect(text).not.toHaveBeenCalled();
    });
  });

  it('signs out after confirmation', async () => {
    const { auth } = renderWithEntries(entries, '/settings');
    expect(screen.getByText(fr.settings.signedInAs('owner@example.com'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: fr.auth.signOut }));
    const dialog = screen.getByRole('dialog', { name: fr.settings.signOutTitle });
    await userEvent.click(within(dialog).getByRole('button', { name: fr.auth.signOut }));
    await waitFor(() => {
      expect(auth.signOut).toHaveBeenCalledOnce();
    });
  });
});
