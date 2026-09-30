import { expect, test } from '@playwright/test';

test('the installed build works offline, including PDF import', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Study' })).toBeVisible();
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
  expect(manifest.name).toBe('DECA Study');
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toContain('512x512');

  // Wait for the service worker to install and take control.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Study' })).toBeVisible();

  await page.getByRole('link', { name: 'Import', exact: true }).click();
  await page.getByTestId('file-input').setInputFiles('samples/finance-sample-exam.pdf');
  await expect(page.getByRole('heading', { name: 'Check the questions' })).toBeVisible();
  await expect(page.locator('.tag', { hasText: '100 questions' })).toBeVisible();
  await context.setOffline(false);
});
