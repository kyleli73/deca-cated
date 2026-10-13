import { expect, test } from '@playwright/test';

// The phone version: built like GitHub Pages builds it (under /deca-cated/,
// VITE_HOSTED=1) and opened on a Pixel 7. Paths are relative to that address.

test('the phone version: paths, touch screen layout, share sheet and offline', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Stand in for the phone's share sheet, and remember what was shared.
  await page.addInitScript(() => {
    const shared: string[] = [];
    Object.assign(window, { shared });
    navigator.canShare = () => true;
    navigator.share = async (data?: ShareData) => {
      shared.push(...(data?.files ?? []).map((f) => f.name));
    };
  });

  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Study' })).toBeVisible();
  // Everything loads from under /deca-cated/, including the logo and the manifest.
  expect(await page.locator('.brand img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await page.locator('.brand img').getAttribute('src')).toBe('/deca-cated/favicon.svg');
  const manifest = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
  expect(manifest.start_url).toBe('.');
  // No News: there's no local server to fetch feeds through.
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'Import' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'News' })).toHaveCount(0);
  await page.goto('#/news');
  await expect(page.getByRole('heading', { name: 'News is only in deca-cated on your computer' })).toBeVisible();

  // Import a PDF the way a phone does: pick a file.
  await page.goto('#/import');
  await expect(page.getByText('Choose a PDF')).toBeVisible();
  await expect(page.getByText('Tap to pick an exam from Files or Downloads')).toBeVisible();
  // 16px, so the phone doesn't zoom in when a field is tapped.
  expect(await page.getByLabel('Exam text').evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
  await page.getByTestId('file-input').setInputFiles('samples/finance-sample-exam.pdf');
  await expect(page.getByRole('heading', { name: 'Check the questions' })).toBeVisible();
  await page.getByRole('button', { name: 'Save exam' }).click();
  await expect(page.getByText(/^Saved “/)).toBeVisible();

  // Exam screen: no keyboard tips on a touch screen, but Review & submit stays.
  await page.getByRole('button', { name: 'Take exam' }).click();
  await expect(page.locator('.exam-count')).toHaveText('Question 1 of 100');
  await expect(page.locator('.kbd-keys')).toBeHidden();
  await expect(page.locator('.kbd-hint').getByRole('button', { name: 'Review & submit' })).toBeVisible();
  await page.getByRole('group', { name: 'Answer options' }).getByRole('button').first().tap();
  await expect(page.locator('.exam-count')).toHaveText('Question 2 of 100');

  // Backups go to the share sheet (Save to Files, Drive…).
  await page.goto('#/settings');
  await page.getByRole('button', { name: 'Download backup (.json)' }).click();
  await expect(page.getByText(/^Downloaded a backup of 1 exams/)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { shared: string[] }).shared)).toEqual([
    expect.stringMatching(/^deca-cated-backup-\d{4}-\d{2}-\d{2}\.json$/),
  ]);

  // Works offline once the service worker has taken over.
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe('http://localhost:4175/deca-cated/');
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Study' })).toBeVisible();
  await context.setOffline(false);

  expect(errors).toEqual([]);
});
