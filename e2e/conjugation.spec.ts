import { expect, test } from '@playwright/test';
import { entryRow, signIn } from './helpers.ts';

test('opens the conjugation of one language from a verb entry', async ({ page }) => {
  await signIn(page);
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill('aller');
  await entryRow(page, 'andare').click();

  await page.getByRole('link', { name: 'Conjugaison de « andare »' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('andare');
  await expect(page.getByText('Auxiliaire : essere')).toBeVisible();
  const passato = page.getByRole('region', { name: /Passato prossimo/ });
  await expect(passato).toContainText('io sono andato/a');
  await expect(passato).toContainText('passé composé');

  await page.getByRole('link', { name: "← Retour à l'entrée" }).click();
  await expect(page.getByRole('link', { name: 'Conjugaison de « andare »' })).toBeVisible();
});

test('edits one cell of a conjugation', async ({ page }, testInfo) => {
  // Edits a shared seeded entry: one browser only, to avoid concurrent overwrites.
  test.skip(testInfo.project.name !== 'chromium', 'Mutates shared seed data');

  await signIn(page);
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill('se lever');
  await entryRow(page, 'alzarsi').click();
  await page.getByRole('link', { name: 'Modifier' }).click();

  // The summary must start with "Presente" ("Condizionale presente" also contains it).
  const presente = page
    .getByRole('group', { name: 'Italien' })
    .locator('details')
    .filter({ has: page.locator('summary', { hasText: /^Presente/ }) });
  await presente.locator('summary').click();
  const noi = presente.getByRole('textbox', { name: 'noi' });
  await expect(noi).toHaveValue('ci alziamo');
  await noi.fill('ci alziamo presto');
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await page.getByRole('link', { name: 'Conjugaison de « alzarsi »' }).click();
  await expect(page.getByRole('region', { name: /^Presente/ })).toContainText(
    'noi ci alziamo presto',
  );
});
