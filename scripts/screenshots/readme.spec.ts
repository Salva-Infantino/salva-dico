import { devices, expect, test, type Page } from '@playwright/test';
import { entryRow, signIn } from '../../e2e/helpers.ts';

const OUT = 'docs/screenshots';
const desktop = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };
const { defaultBrowserType: _browser, ...phone } = devices['iPhone 16'];

async function shot(page: Page, name: string) {
  // Let entrance animations and the score count-up finish.
  await page.waitForTimeout(1500);
  // No hover effect, no notification ("ready to work offline") over the page.
  await page.mouse.move(0, 0);
  for (const close of await page.getByRole('button', { name: 'Fermer' }).all()) {
    await close.click();
  }
  await page.screenshot({ path: `${OUT}/${name}.png`, animations: 'disabled' });
}

test.describe('desktop, light', () => {
  test.use({ ...desktop, colorScheme: 'light' });

  test('dictionary', async ({ page }) => {
    await signIn(page);
    // Fill the preview panel next to the table.
    await entryRow(page, 'andare').click();
    await expect(page.getByRole('heading', { name: 'aller', exact: true })).toBeVisible();
    await shot(page, 'dictionary');
  });
});

test.describe('desktop, dark', () => {
  test.use({ ...desktop, colorScheme: 'dark' });

  test('conjugation', async ({ page }) => {
    await signIn(page);
    await page.getByRole('searchbox', { name: 'Rechercher' }).fill('se lever');
    await entryRow(page, 'alzarsi').click();
    await page.getByRole('link', { name: 'Conjugaison de « levantarse »' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('levantarse');
    await shot(page, 'conjugation');
  });
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`phone, ${colorScheme}`, () => {
    test.use({ ...phone, colorScheme });

    test('quiz', async ({ page }) => {
      await signIn(page);
      await page.getByRole('link', { name: 'Quiz' }).click();
      await page.getByRole('checkbox', { name: 'Mot' }).uncheck();
      await page.getByRole('radio', { name: 'Plus récentes d’abord' }).check();
      await page.getByRole('button', { name: 'Commencer (2 cartes)' }).click();
      await page.locator('.quiz-target').nth(0).click();
      await page.locator('.quiz-target').nth(2).click();
      if (colorScheme === 'light') {
        await shot(page, 'quiz-phone');
        return;
      }
      // Dark theme: the score screen (both cards known on the first try).
      await page.getByRole('button', { name: 'Je connais' }).click();
      await expect(page.getByText('Carte 2 sur 2')).toBeVisible();
      await page.getByRole('button', { name: 'Je connais' }).click();
      await expect(page.getByRole('heading', { name: 'Session terminée' })).toBeVisible();
      await shot(page, 'score-phone');
    });
  });
}
