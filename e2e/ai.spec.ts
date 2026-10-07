import { expect, test } from '@playwright/test';
import { displayed, newEntryLink, signIn } from './helpers.ts';

// The AI function is intercepted: no real Gemini call from the E2E tests.

test('translates a word with the AI, reviews it and saves it', async ({ page }, testInfo) => {
  const word = `zzia${testInfo.project.name.replace(/\W/g, '')}${String(Date.now())}`;
  const requests: { body: unknown; authorization: string | null }[] = [];
  await page.route('**/api/translate', async (route) => {
    requests.push({
      body: route.request().postDataJSON() as unknown,
      authorization: await route.request().headerValue('authorization'),
    });
    await route.fulfill({
      json: {
        content: {
          type: 'word',
          translations: {
            fr: [{ text: word }],
            en: [{ text: `${word}-en` }],
            es: [{ text: `${word}-es` }],
            it: [{ text: `${word}-it` }],
          },
        },
      },
    });
  });

  await signIn(page);
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill(word);
  await page.getByRole('link', { name: `Ajouter « ${word} »` }).click();
  await page.getByRole('combobox', { name: 'Type' }).selectOption('word');
  await page.getByRole('button', { name: 'Traduire avec l’IA' }).click();

  // Review screen: everything editable, nothing saved yet.
  await expect(page.getByRole('heading', { name: 'Vérifie la traduction' })).toBeVisible();
  expect(requests).toEqual([
    {
      body: { sourceLang: 'fr', text: word, type: 'word' },
      authorization: expect.stringMatching(/^Bearer .+/) as unknown,
    },
  ]);
  const english = page.getByRole('group', { name: 'Anglais' }).getByRole('textbox');
  await expect(english).toHaveValue(`${word}-en`);
  await english.fill(`${word}-en-fixed`);
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(page.getByRole('region', { name: 'Anglais' })).toContainText(
    displayed(`${word}-en-fixed`),
  );
});

test('shows AI errors in French and keeps the typed word', async ({ page }) => {
  await page.route('**/api/translate', (route) =>
    route.fulfill({ status: 429, json: { error: 'quota' } }),
  );
  await signIn(page);
  await newEntryLink(page).click();
  await page.getByRole('textbox', { name: 'Mot ou expression' }).fill('ratatouille');
  await page.getByRole('button', { name: 'Traduire avec l’IA' }).click();

  await expect(page.getByRole('alert')).toContainText('Le quota gratuit de l’IA est atteint');
  await expect(page.getByRole('textbox', { name: 'Mot ou expression' })).toHaveValue('ratatouille');
});

test('disables the AI offline', async ({ page, context }) => {
  await signIn(page);
  await newEntryLink(page).click();
  await page.getByRole('textbox', { name: 'Mot ou expression' }).fill('ratatouille');
  await context.setOffline(true);

  await expect(page.getByRole('button', { name: 'Traduire avec l’IA' })).toBeDisabled();
  await expect(page.getByText('L’IA n’est pas disponible hors ligne.')).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole('button', { name: 'Traduire avec l’IA' })).toBeEnabled();
});
