import { expect, type Page } from '@playwright/test';

// The E2E tests run against the Firebase emulators seeded by scripts/seed-emulator.ts
// (26 entries). Specs add entries concurrently, so counts are not asserted exactly.

export async function signIn(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Connexion de dev (émulateur)' }).click();
  await expect(page.getByText(/^\d+ entrées$/)).toBeVisible();
}
