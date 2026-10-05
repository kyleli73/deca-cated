import { expect, test, type Page } from '@playwright/test';

// Three Finance (FI) questions and one Economics (EC) question.
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
3. Collateral is
A. a pledged asset
B. interest
C. principal
D. equity
4. Scarcity means
A. wants exceed resources
B. prices always fall
C. goods are free
D. demand is fixed
ANSWER KEY
1. B
Receivables are current assets. SOURCE: FI:073
2. A
A budget is a financial plan. SOURCE: FI:106
3. A
Collateral secures a loan. SOURCE: FI:043
4. A
Resources are limited. SOURCE: EC:001`;

const tile = (page: Page, label: string) => page.locator('.tile').filter({ has: page.locator('.label', { hasText: new RegExp(`^${label}$`) }) });

test('marking guesses: during the exam, in results, stats and mistakes review', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/#/import');
  await page.getByLabel('Exam text').fill(EXAM);
  await page.getByRole('button', { name: 'Read exam' }).click();
  await page.getByLabel('Year').fill('2025');
  await page.getByRole('button', { name: 'Save exam' }).click();
  await expect(page.getByText(/^Saved “/)).toBeVisible();
  await page.getByRole('link', { name: 'Study', exact: true }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page.locator('.exam-count')).toHaveText('Question 1 of 4');

  const count = page.locator('.exam-count');
  const guessing = page.getByRole('button', { name: 'Guessing' });

  // 1: right and sure.
  await expect(guessing).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('b');
  await expect(count).toHaveText('Question 2 of 4');

  // 2: G marks a guess before answering; right, but guessed.
  await page.keyboard.press('g');
  await expect(guessing).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('a');
  await expect(count).toHaveText('Question 3 of 4');
  await expect(guessing).toHaveAttribute('aria-pressed', 'false'); // each question starts unmarked

  // 3: Shift + letter answers as a guess; wrong.
  await page.keyboard.press('Shift+C');
  await expect(count).toHaveText('Question 4 of 4');

  // 4: wrong, and sure of it.
  await page.keyboard.press('d');
  await expect(count).toHaveText('Review');

  // The grid shows which answers were guesses.
  await expect(page.getByText('You marked 2 as guesses.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Question 2, answered, marked as a guess' })).toHaveClass(/guessed/);
  await expect(page.getByRole('button', { name: 'Question 3, answered, marked as a guess' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Question 1, answered', exact: true })).toBeVisible();

  // Marking and unmarking afterwards: the button and G both toggle.
  await page.getByRole('button', { name: 'Question 1, answered', exact: true }).click();
  await guessing.click();
  await expect(guessing).toHaveAttribute('aria-pressed', 'true');
  await expect(count).toHaveText('Question 1 of 4'); // marking doesn't move on
  await page.keyboard.press('g');
  await expect(guessing).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByRole('button', { name: 'Review & submit →' }).click();
  await expect(page.getByText('You marked 2 as guesses.')).toBeVisible();

  // The guess marks survive Save & exit.
  await page.getByRole('link', { name: /Save & exit/ }).click();
  await page.getByRole('link', { name: 'Resume' }).click();
  await expect(page.getByText('You marked 2 as guesses.')).toBeVisible();
  await page.getByRole('button', { name: 'Submit exam' }).click();

  // Results: 2/4 right, but only 1 known.
  await expect(page.locator('.hero-figure')).toHaveText('2/4');
  await expect(tile(page, 'You knew')).toContainText('25%');
  const sure = page.locator('section', { has: page.getByRole('heading', { name: 'How sure you were' }) });
  await expect(sure.locator('.tile', { hasText: 'Knew it' }).locator('.value')).toHaveText('1');
  await expect(sure.locator('.tile', { hasText: 'Lucky guesses' }).locator('.value')).toHaveText('1');
  await expect(sure.locator('.tile', { hasText: 'Sure but wrong' }).locator('.value')).toHaveText('1');
  await expect(sure.locator('.tile', { hasText: 'Guessed wrong' }).locator('.value')).toHaveText('1');

  // By area, what you knew, weakest first: Economics 0% (0/1), Finance 33% (2/3 right, 1 by guessing).
  const areas = page.getByRole('table', { name: 'What you know by instructional area' });
  const rows = areas.getByRole('row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('0%');
  await expect(rows.nth(0)).toContainText('0/1 right');
  await expect(rows.nth(1)).toContainText('33%');
  await expect(rows.nth(1)).toContainText('2/3 right');
  await expect(rows.nth(1).getByRole('cell', { name: 'Knew 33%, 2 of 3 right, 1 by guessing' })).toBeVisible();

  // The Guessed filter.
  await page.getByRole('button', { name: 'Guessed (2)' }).click();
  await expect(page.locator('.review-item')).toHaveCount(2);
  await expect(page.locator('.review-item .guess-tag')).toHaveCount(2);
  await expect(page.locator('.review-item').first()).toContainText('A budget is a');
  await expect(page.locator('.review-item').first()).toContainText('✓ Correct');
  await expect(page.locator('.review-item').nth(1)).toContainText('✗ Wrong');
  await expect(page.getByRole('button', { name: 'Retry missed & guessed' })).toBeVisible();

  // Stats.
  await page.getByRole('link', { name: 'Stats', exact: true }).click();
  await expect(tile(page, 'You knew')).toContainText('25%');
  await expect(tile(page, 'You knew')).toContainText('1 of 4 answers right without guessing · 1 lucky guess');
  await expect(tile(page, 'Sure but wrong')).toContainText('1');
  await expect(page.getByRole('table', { name: 'What you know by instructional area' })).toBeVisible();

  // The lucky guess comes back in Mistakes review with the two wrong answers.
  await page.getByRole('link', { name: 'Study', exact: true }).click();
  const mistakes = page.locator('section', { has: page.getByRole('heading', { name: 'Mistakes review' }) });
  await expect(mistakes).toContainText('3 due today');

  await page.getByRole('link', { name: 'Wrong answers', exact: true }).click();
  await expect(page.locator('.review-item')).toHaveCount(3);
  const lucky = page.locator('.review-item', { hasText: 'A budget is a' });
  await expect(lucky).toContainText('Guessed right 1×');
  await expect(lucky.locator('.guess-tag')).toBeVisible();
  await expect(lucky.locator('.review-opt.wrong')).toHaveCount(0);
  const missed = page.locator('.review-item', { hasText: 'Collateral is' });
  await expect(missed).toContainText('Missed 1×');
  await expect(missed.locator('.guess-tag')).toHaveCount(0);

  expect(errors).toEqual([]);
});
