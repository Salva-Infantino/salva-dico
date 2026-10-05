import { expect, test, type Locator, type Page } from '@playwright/test';
import { signIn } from './helpers.ts';

// Verbs only: the 2 seeded verbs (aller, se lever), which no other spec adds or masters.

/** Drags the card horizontally with the mouse (Pointer Events, as with a finger). */
async function dragCard(page: Page, card: Locator, dx: number) {
  const box = await card.boundingBox();
  if (!box) throw new Error('Card not visible');
  const x = box.x + box.width / 2;
  const y = box.y + 40;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + 5, { steps: 8 });
  await page.mouse.up();
}

test('plays a quiz with the keyboard, a swipe and the buttons', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Quiz' }).click();
  await page.getByRole('checkbox', { name: 'Mot' }).uncheck();
  await page.getByRole('button', { name: 'Commencer (2 cartes)' }).click();

  await expect(page.getByText('Carte 1 sur 2')).toBeVisible();
  const targets = page.locator('.quiz-target');
  await expect(targets).toHaveCount(3);
  await expect(targets.first()).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Space');
  for (const target of await targets.all()) {
    await expect(target).toHaveAttribute('aria-pressed', 'true');
  }

  // Swipe right: "je connais". A short drag first, which is not an answer.
  const card = page.locator('.swipe-card');
  await dragCard(page, card, 30);
  await expect(page.getByText('Carte 1 sur 2')).toBeVisible();
  await dragCard(page, card, 250);
  await expect(page.getByText('Carte 2 sur 2')).toBeVisible();
  await expect(targets.first()).toHaveAttribute('aria-pressed', 'false');

  // ← "à réviser": the card comes back once at the end.
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText('Révision 1 sur 1')).toBeVisible();
  await page.getByRole('button', { name: 'Je connais' }).click();

  await expect(page.getByRole('heading', { name: 'Session terminée' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Score : 50 %' })).toBeVisible();
  await expect(page.getByText('1 sur 2 du premier coup')).toBeVisible();

  // A new quiz starts from the remembered settings.
  await page.getByRole('link', { name: 'Nouveau quiz' }).click();
  await expect(page.getByRole('checkbox', { name: 'Mot' })).not.toBeChecked();
});
