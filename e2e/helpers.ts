import { expect, type Locator, type Page } from '@playwright/test';

// The E2E tests run against the Firebase emulators seeded by scripts/seed-emulator.ts
// (26 entries). Specs add entries concurrently, so counts are not asserted exactly.

export async function signIn(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Connexion de dev (émulateur)' }).click();
  await expect(page.getByText(/^\d+ entrées$/)).toBeVisible();
}

/**
 * The dictionary row (phone card or wide-screen table row link) containing `text`.
 * Phones open the entry page; wide screens show it in the preview panel.
 */
export function entryRow(page: Page, text: string | RegExp): Locator {
  return page
    .locator('a.entry-card')
    .filter({ hasText: text })
    .or(page.locator('tbody tr').filter({ hasText: text }).locator('a.row-link'))
    .first();
}

/** "Add an entry": the floating button on phones, the sidebar button on wide screens. */
export function newEntryLink(page: Page): Locator {
  return page
    .getByRole('link', { name: /^(Ajouter une entrée|Nouvelle entrée)$/ })
    .filter({ visible: true })
    .first();
}

export function isWide(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= 1024;
}
