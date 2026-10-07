import { expect, test } from '@playwright/test';
import { entryRow, isWide, signIn } from './helpers.ts';

test('lists the dictionary alphabetically after sign-in', async ({ page }) => {
  await signIn(page);
  const firstRow = page.locator('a.entry-card, tbody tr').first();
  await expect(firstRow).toContainText('Aller');
  await expect(firstRow).toContainText('Andare');
});

test('searches across languages, opens an entry and goes back to the search', async ({ page }) => {
  await signIn(page);
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill('il ragazzo');
  await expect(page.getByText('1 résultat')).toBeVisible();
  await expect(page).toHaveURL(/\?q=il\+ragazzo$/);

  await entryRow(page, 'ragazzo').click();
  // Phones open the entry page, wide screens a preview next to the list.
  await expect(page).toHaveURL(isWide(page) ? /[?&]entry=/ : /\/entries\//);
  const italian = page.getByRole('region', { name: 'Italien' });
  await expect(italian.getByRole('listitem')).toHaveText('Ragazzo');
  await expect(page.getByRole('region', { name: 'Anglais' })).toContainText('Boy');

  if (!isWide(page)) {
    await page.getByRole('button', { name: 'Retour au dictionnaire' }).click();
  }
  await expect(page.getByRole('searchbox', { name: 'Rechercher' })).toHaveValue('il ragazzo');
});

test('filters by type and shows another language first', async ({ page }) => {
  await signIn(page);
  await page.getByRole('radio', { name: 'Verbes' }).click();
  await expect(page.getByText('2 résultats')).toBeVisible();

  await page.getByRole('radio', { name: 'Tout' }).click();
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill('casa');
  await expect(page.getByText('1 résultat')).toBeVisible();
  // Phones: language chips; wide screens: the table's column headers.
  if (isWide(page)) {
    await page.getByRole('columnheader').getByRole('button', { name: 'Anglais' }).click();
    await expect(page.locator('tbody td.shown-lang')).toHaveText('House');
  } else {
    await page.getByRole('radio', { name: 'Anglais' }).click();
    await expect(page.locator('.entry-card-word')).toHaveText('House');
  }
  await expect(page).toHaveURL(/lang=en/);
  await expect(page.getByText('1 résultat')).toBeVisible();
});
