import { expect, test } from '@playwright/test';
import { displayed, signIn } from './helpers.ts';

// Playwright only drives service workers reliably in Chromium: in Firefox and WebKit
// an offline reload cannot be served from the precache, so the scenario is skipped there.
test.skip(({ browserName }) => browserName !== 'chromium', 'Service workers: Chromium only');

test('works offline: reload, search, add, master, quiz, then syncs on reconnect', async ({
  page,
  context,
  browser,
}, testInfo) => {
  const word = `zzoffline${testInfo.project.name.replace(/\W/g, '')}${String(Date.now())}`;

  // Online first: sign in and let the service worker precache the app shell.
  await signIn(page);
  await page.evaluate('navigator.serviceWorker.ready.then(() => true)');

  await context.setOffline(true);
  await page.reload();

  // The app shell comes from the service worker, the session and the entries from the
  // local caches (Firebase Auth persistence, Firestore IndexedDB cache).
  await expect(page.getByText(/^\d+ entrées$/)).toBeVisible();
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill('ragazzo');
  await expect(page.getByText('1 résultat')).toBeVisible();

  // Add an entry offline: the write is applied locally at once and queued.
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill(word);
  await page.getByRole('link', { name: `Ajouter « ${word} »` }).click();
  // The AI needs the network: its button is disabled with a message.
  await expect(page.getByRole('button', { name: 'Traduire avec l’IA' })).toBeDisabled();
  await expect(page.getByText('L’IA n’est pas disponible hors ligne.')).toBeVisible();
  await page.getByRole('button', { name: 'Manuel' }).click();
  const field = (lang: string) =>
    page.getByRole('group', { name: lang }).getByRole('textbox', { name: 'Mot ou expression' });
  await field('Anglais').fill(`${word}-en`);
  await field('Espagnol').fill(`${word}-es`);
  await field('Italien').fill(`${word}-it`);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('region', { name: 'Italien' })).toContainText(
    displayed(`${word}-it`),
  );

  const mastered = page.getByRole('switch', { name: 'Maîtrisé' });
  await mastered.click();
  await expect(mastered).toHaveAttribute('aria-checked', 'true');

  // A quiz runs offline too.
  await page.getByRole('button', { name: /Retour au dictionnaire/ }).click();
  await page.getByRole('link', { name: 'Quiz' }).click();
  await page.getByRole('button', { name: /^Commencer/ }).click();
  await expect(page.getByText(/^Carte 1 sur \d+$/)).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/^Carte 2 sur \d+$/)).toBeVisible();

  // Back online: the queued writes reach the server. Another device sees them.
  await context.setOffline(false);
  const otherDevice = await browser.newContext();
  try {
    const otherPage = await otherDevice.newPage();
    await signIn(otherPage);
    await otherPage.getByRole('searchbox', { name: 'Rechercher' }).fill(`${word}-es`);
    await expect(otherPage.getByText('1 résultat')).toBeVisible({ timeout: 15_000 });
    await otherPage.getByRole('link', { name: new RegExp(word) }).click();
    await expect(otherPage.getByRole('switch', { name: 'Maîtrisé' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  } finally {
    await otherDevice.close();
  }
});
