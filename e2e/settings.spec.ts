import { readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers.ts';

interface ExportFile {
  app: string;
  entries: { id: string; translations: Record<'fr' | 'en' | 'es' | 'it', { text: string }[]> }[];
}

test('exports the dictionary, imports a modified export, and signs out', async ({
  page,
}, testInfo) => {
  const word = `zzimport${testInfo.project.name.replace(/\W/g, '')}${String(Date.now())}`;
  await signIn(page);
  await page.getByRole('link', { name: 'Réglages' }).click();

  // Export.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Exporter \(\d+ entrées\)$/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^salva-dico-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(await readFile(await download.path(), 'utf8')) as ExportFile;
  expect(exported.app).toBe('salva-dico');
  expect(exported.entries.length).toBeGreaterThan(20);

  // Import one seeded entry (already present) plus a new one. Other specs add and
  // delete entries in parallel, so the file does not reuse the whole export.
  const arbre = exported.entries.find((entry) => entry.translations.fr[0]?.text === 'arbre');
  if (!arbre) throw new Error('Seeded entry missing from the export');
  const text = (lang: string) => [{ text: `${word}-${lang}` }];
  exported.entries = [
    arbre,
    {
      ...arbre,
      id: word,
      translations: { fr: text('fr'), en: text('en'), es: text('es'), it: text('it') },
    },
  ];
  const file = testInfo.outputPath('import.json');
  await writeFile(file, JSON.stringify(exported));
  await page.getByLabel('Importer un fichier…').setInputFiles(file);

  await expect(page.getByText('1 nouvelle entrée')).toBeVisible();
  await expect(page.getByText('1 entrée déjà présente (ignorée)')).toBeVisible();
  await page.getByRole('button', { name: 'Importer 1 entrée' }).click();
  await expect(page.getByRole('status').filter({ hasText: '1 entrée importée.' })).toBeVisible();

  await page.getByRole('link', { name: '← Retour au dictionnaire' }).click();
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill(`${word}-it`);
  await expect(page.getByText('1 résultat')).toBeVisible();

  // Sign out, with a confirmation.
  await page.getByRole('link', { name: 'Réglages' }).click();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('button', { name: 'Connexion de dev (émulateur)' })).toBeVisible();
});
