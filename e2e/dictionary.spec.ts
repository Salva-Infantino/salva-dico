import { expect, test, type Page } from '@playwright/test';

// Runs against the Firebase emulators seeded by scripts/seed-emulator.ts (26 entries).

async function signIn(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Connexion de dev (émulateur)' }).click();
  await expect(page.getByText('26 entrées')).toBeVisible();
}

test('lists the dictionary alphabetically after sign-in', async ({ page }) => {
  await signIn(page);
  const firstRow = page.getByRole('list').getByRole('link').first();
  await expect(firstRow).toContainText('aller');
  await expect(firstRow).toContainText('andare');
});

test('searches across languages, opens an entry and goes back to the search', async ({ page }) => {
  await signIn(page);
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill('il ragazzo');
  await expect(page.getByText('1 résultat')).toBeVisible();
  await expect(page).toHaveURL(/\?q=il\+ragazzo$/);

  await page.getByRole('link', { name: /ragazzo/ }).click();
  await expect(page).toHaveURL(/\/entries\//);
  const italian = page.getByRole('region', { name: 'Italien' });
  await expect(italian).toContainText('il ragazzo · i ragazzi · m.');
  await expect(page.getByRole('region', { name: 'Anglais' })).toContainText('boy');

  await page.getByRole('button', { name: '← Retour au dictionnaire' }).click();
  await expect(page.getByRole('searchbox', { name: 'Rechercher' })).toHaveValue('il ragazzo');
});

test('filters by type and by language', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Verbe' }).click();
  await expect(page.getByText('2 résultats')).toBeVisible();

  await page.getByRole('button', { name: 'Verbe' }).click();
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill('casa');
  await expect(page.getByText('1 résultat')).toBeVisible();
  await page.getByRole('button', { name: /Anglais/ }).click();
  await expect(page.getByText('Aucun résultat.')).toBeVisible();
});
