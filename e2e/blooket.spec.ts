import { expect, test } from '@playwright/test';

const EXAM = `FINANCE CLUSTER EXAM
1. Which is a current asset?
A. Equipment
B. Accounts receivable
C. Mortgage payable
D. Retained earnings
2. A budget is a
A. financial plan
B. tax form
C. receipt
D. bank statement
ANSWER KEY
1. B
Receivables are current assets. SOURCE: FI:073
2. A
A budget is a financial plan. SOURCE: FI:106`;

const SET_LINK = 'https://dashboard.blooket.com/set/66f1a2b3c4d5e6f708192a3b';

test('Blooket sets: download, paste the link back, open questions in Blooket', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => void d.accept());

  // Two wrong answers.
  await page.goto('/#/import');
  await page.getByLabel('Exam text').fill(EXAM);
  await page.getByRole('button', { name: 'Read exam' }).click();
  await page.getByLabel('Year').fill('2025');
  await page.getByRole('button', { name: 'Save exam' }).click();
  await expect(page.getByText(/^Saved “/)).toBeVisible();
  await page.getByRole('link', { name: 'Study', exact: true }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await page.keyboard.press('a');
  await expect(page.locator('.exam-count')).toHaveText('Question 2 of 2');
  await page.keyboard.press('b');
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await expect(page.locator('.hero-figure')).toHaveText('0/2');

  // Download the set: it's remembered, with what to do next on Blooket.
  await page.getByRole('link', { name: 'Wrong answers', exact: true }).click();
  await expect(page.locator('.review-item')).toHaveCount(2);
  await page.getByLabel('Set name').fill('Finance week 1');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download for Blooket (.csv)' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^deca-wrong-answers-blooket-\d{4}-\d{2}-\d{2}\.csv$/);
  const next = page.getByRole('status').filter({ hasText: 'Next, on Blooket' });
  await expect(next).toContainText('create a set called “Finance week 1” and choose CSV Import');
  await expect(next.getByRole('link', { name: 'blooket.com' })).toHaveAttribute('href', 'https://www.blooket.com/');
  const sets = page.locator('.blooket-sets > li');
  await expect(sets).toHaveCount(1);
  await expect(sets.first()).toContainText('Finance week 1');
  await expect(sets.first()).toContainText('2 questions');

  // Only a real blooket.com link is accepted.
  const linkBox = page.getByLabel('Blooket link for Finance week 1');
  await linkBox.fill('https://blooket.com.example.net/set/abc');
  await page.getByRole('button', { name: 'Save link' }).click();
  await expect(page.getByRole('alert')).toHaveText("That isn't a Blooket link. Open the set on blooket.com and copy the address from the address bar.");
  await expect(page.getByRole('link', { name: 'Open in Blooket ↗' })).toHaveCount(0);

  await linkBox.fill(SET_LINK);
  await page.getByRole('button', { name: 'Save link' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  // One on the set, one on each of its questions; all open the set in a new tab.
  const open = page.getByRole('link', { name: 'Open in Blooket ↗' });
  await expect(open).toHaveCount(3);
  for (const link of await open.all()) {
    await expect(link).toHaveAttribute('href', SET_LINK);
    await expect(link).toHaveAttribute('target', '_blank');
  }
  await expect(page.locator('.review-item').first().getByRole('link', { name: 'Open in Blooket ↗' })).toHaveAttribute(
    'title',
    'Opens the set “Finance week 1” on Blooket',
  );

  // Kept after a reload; removing the set removes its links.
  await page.reload();
  await expect(open).toHaveCount(3);
  await sets.first().getByRole('button', { name: 'Remove' }).click();
  await expect(sets).toHaveCount(0);
  await expect(open).toHaveCount(0);

  expect(errors).toEqual([]);
});
