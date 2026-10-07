import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { entryRow, signIn } from './helpers.ts';

// Automated WCAG 2.2 AA audit (axe-core) of every screen, in both color schemes.
// Rendering rules do not depend on the engine: Chromium only keeps the suite fast.
test.skip(({ browserName }) => browserName !== 'chromium', 'Audited once, in Chromium');

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

/** Wider-than-screen content makes phones zoom out and shifts the fixed bars. */
async function expectNoHorizontalOverflow(page: Page, screen: string) {
  const overflow = await page.evaluate(
    'document.documentElement.scrollWidth - document.documentElement.clientWidth',
  );
  expect(overflow, `${screen}: horizontal overflow`).toBe(0);
}

/** Fails with a readable list of violations (rule, impact, elements). */
async function audit(page: Page, screen: string) {
  // Let entrance animations finish: axe measures contrast on the final colors.
  await page.waitForTimeout(400);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = violations.map(
    (v) =>
      `${screen}: ${v.id} (${v.impact ?? 'n/a'}) on ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test('sign-in, dictionary, entry, conjugation and editors', async ({ page }) => {
      await page.goto('/');
      await expect(
        page.getByRole('button', { name: 'Connexion de dev (émulateur)' }),
      ).toBeVisible();
      await audit(page, 'sign-in');

      await signIn(page);
      await audit(page, 'dictionary');

      await page.getByRole('searchbox', { name: 'Rechercher' }).fill('aller');
      await entryRow(page, 'andare').click();
      // Entry page on phones (h1), preview next to the table on wide screens (h2).
      await expect(page.getByRole('heading', { name: 'Aller', exact: true })).toBeVisible();
      await audit(page, 'entry (page or preview)');

      await page.getByRole('link', { name: 'Conjugaison de « andare »' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Andare');
      await audit(page, 'conjugation');

      await page.goBack();
      await page.getByRole('link', { name: 'Modifier' }).click();
      await expect(
        page.getByRole('heading', { level: 1, name: "Modifier l'entrée" }),
      ).toBeVisible();
      await audit(page, 'verb editor');

      await page.goto('/entries/new?mode=manual');
      await page.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await audit(page, 'word editor with errors');

      await page.goto('/entries/new');
      await expect(page.getByRole('button', { name: 'Traduire avec l’IA' })).toBeVisible();
      await audit(page, 'AI mode');
    });

    test.describe('phone layout', () => {
      test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

      test('dictionary, entry page and quiz card', async ({ page }) => {
        await signIn(page);
        await audit(page, 'dictionary (phone)');
        await expectNoHorizontalOverflow(page, 'dictionary (phone)');

        await page.getByRole('searchbox', { name: 'Rechercher' }).fill('aller');
        await entryRow(page, 'andare').click();
        await expect(page.getByRole('heading', { level: 1, name: 'aller' })).toBeVisible();
        await audit(page, 'entry page (phone)');
        await expectNoHorizontalOverflow(page, 'entry page (phone)');

        await page.goto('/entries/new');
        await expect(page.getByRole('button', { name: 'Traduire avec l’IA' })).toBeVisible();
        await audit(page, 'AI mode (phone)');
        await expectNoHorizontalOverflow(page, 'AI mode (phone)');

        await page.goto('/settings');
        await expect(page.getByRole('heading', { level: 1, name: 'Réglages' })).toBeVisible();
        await expectNoHorizontalOverflow(page, 'settings (phone)');

        await page.goto('/quiz');
        await audit(page, 'quiz setup (phone)');
        await expectNoHorizontalOverflow(page, 'quiz setup (phone)');
        await page.getByRole('checkbox', { name: 'Mot' }).uncheck();
        await page.getByRole('button', { name: 'Commencer (2 cartes)' }).click();
        await page.keyboard.press('Space');
        await audit(page, 'quiz card (phone)');
      });
    });

    test('quiz and settings', async ({ page }) => {
      await signIn(page);
      await page.getByRole('link', { name: 'Quiz' }).click();
      await audit(page, 'quiz setup');

      await page.getByRole('checkbox', { name: 'Mot' }).uncheck();
      await page.getByRole('button', { name: 'Commencer (2 cartes)' }).click();
      await expect(page.getByText('Carte 1 sur 2')).toBeVisible();
      await audit(page, 'quiz card (face down)');
      await page.keyboard.press('Space');
      await audit(page, 'quiz card (face up)');

      await page.getByRole('button', { name: 'Je connais' }).click();
      await expect(page.getByText('Carte 2 sur 2')).toBeVisible();
      await page.getByRole('button', { name: 'Je connais' }).click();
      await expect(page.getByRole('heading', { name: 'Session terminée' })).toBeVisible();
      // The score counts up for ~1.2 s.
      await page.waitForTimeout(1500);
      await audit(page, 'quiz score');

      await page.goto('/settings');
      await expect(page.getByRole('heading', { level: 1, name: 'Réglages' })).toBeVisible();
      await audit(page, 'settings');
    });
  });
}
