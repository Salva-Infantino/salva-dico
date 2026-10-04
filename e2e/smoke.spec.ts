import { expect, test } from '@playwright/test';

test('home page loads with the French UI', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Salva Dico');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { level: 1, name: 'Dictionnaire' })).toBeVisible();
});

test('exposes a web app manifest', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();

  const response = await request.get(href ?? '');
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as { name: string; lang: string };
  expect(manifest.name).toBe('Salva Dico');
  expect(manifest.lang).toBe('fr');
});
