import { expect, test } from '@playwright/test';

test('signed-out visitors see the French sign-in screen', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Salva Dico');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { level: 1, name: 'Salva Dico' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Se connecter avec Google' })).toBeVisible();
});

test('the app runs under its Content-Security-Policy without violations', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/Content[- ]Security[- ]Policy/i.test(message.text())) violations.push(message.text());
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Se connecter avec Google' })).toBeVisible();

  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(violations).toEqual([]);
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
