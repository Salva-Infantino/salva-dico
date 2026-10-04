import { expect, test } from '@playwright/test';
import { signIn } from './helpers.ts';

// Words are unique per run and browser: specs run in parallel on shared emulator data.
// The "zz" prefix sorts them after the seeded entries.
test('adds, edits, masters and deletes an entry', async ({ page }, testInfo) => {
  const word = `zzmot${testInfo.project.name.replace(/\W/g, '')}${String(Date.now())}`;
  await signIn(page);

  // Search, nothing found: add it from the search.
  const search = page.getByRole('searchbox', { name: 'Rechercher' });
  await search.fill(word);
  await page.getByRole('link', { name: `Ajouter « ${word} »` }).click();
  await page.getByRole('button', { name: 'Manuel' }).click();

  await page.getByRole('radio', { name: 'Expression' }).click();
  const field = (lang: string) =>
    page.getByRole('group', { name: lang }).getByRole('textbox', { name: 'Expression' });
  await expect(field('Français')).toHaveValue(word);
  await field('Anglais').fill(`${word}-en`);
  await field('Espagnol').fill(`${word}-es`);
  await field('Italien').fill(`${word}-it`);
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  // The new entry opens right away (local write, synced in the background).
  await expect(page.getByRole('status').filter({ hasText: 'Entrée ajoutée.' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Italien' })).toContainText(`${word}-it`);

  // Edit: add a second English translation.
  await page.getByRole('link', { name: 'Modifier' }).click();
  await page
    .getByRole('group', { name: 'Anglais' })
    .getByRole('button', { name: 'Ajouter une traduction' })
    .click();
  await page
    .getByRole('group', { name: 'Anglais' })
    .getByRole('textbox', { name: 'Expression' })
    .nth(1)
    .fill(`${word}-en2`);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('region', { name: 'Anglais' })).toContainText(`${word}-en2`);

  // Mastered switch.
  const mastered = page.getByRole('switch', { name: 'Maîtrisé' });
  await expect(mastered).toHaveAttribute('aria-checked', 'false');
  await mastered.click();
  await expect(mastered).toHaveAttribute('aria-checked', 'true');

  // Delete with confirmation.
  await page.getByRole('button', { name: 'Supprimer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Entrée supprimée.' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill(word);
  await expect(page.getByText('Aucun résultat.')).toBeVisible();
});

test('warns about a duplicate while typing', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Ajouter une entrée' }).click();
  await page.getByRole('button', { name: 'Manuel' }).click();
  await page.getByRole('radio', { name: 'Expression' }).click();
  await page
    .getByRole('group', { name: 'Français' })
    .getByRole('textbox', { name: 'Expression' })
    .fill('Bonjour');
  await expect(page.getByText('« Bonjour » existe déjà en français.')).toBeVisible();
});
