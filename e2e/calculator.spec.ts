import { expect, test, type Page } from '@playwright/test';

const EXAM = `1. Which is a current asset?
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
ANSWER KEY
1. B
Receivables. SOURCE: FI:073
2. A
Budgets. SOURCE: FI:106
3. A
Collateral. SOURCE: FI:043`;

async function startDrill(page: Page) {
  await page.goto('/#/import');
  await page.getByLabel('Exam text').fill(EXAM);
  await page.getByRole('button', { name: 'Read exam' }).click();
  await page.getByLabel('Year').fill('2024');
  await page.getByRole('button', { name: 'Save exam' }).click();
  await expect(page.getByText(/^Saved “/)).toBeVisible();
  await page.getByRole('link', { name: 'Study', exact: true }).click();
  const drill = page.locator('section', { has: page.getByRole('heading', { name: 'Custom drill' }) });
  await drill.getByLabel('Number of questions').fill('3');
  await drill.getByRole('button', { name: 'Start drill' }).click();
  await expect(page.locator('.exam-count')).toHaveText('Question 1 of 3');
}

test('calculator during an exam: typing, buttons, percent, powers, history, and no accidental answers', async ({ page }) => {
  await startDrill(page);
  const calc = page.getByRole('complementary', { name: 'Calculator' });
  const expr = page.getByTestId('calc-expr');
  const result = page.getByTestId('calc-result');
  const options = page.getByRole('group', { name: 'Answer options' }).getByRole('button');

  await page.getByRole('button', { name: 'Calculator' }).click();
  await expect(calc).toBeVisible();
  await expect(calc).toBeFocused();

  // Typing: digits 1–4 go to the calculator, not the answer shortcuts.
  await page.keyboard.type('(12000-2000)/5');
  await expect(expr).toHaveText('(12000−2000)÷5');
  await expect(result).toHaveText('2,000'); // live preview
  await page.keyboard.press('Enter');
  await expect(expr).toHaveText('(12000−2000)÷5 =');
  await expect(result).toHaveText('2,000');
  await expect(page.locator('.exam-count')).toHaveText('Question 1 of 3');
  await expect(options.and(page.locator('[aria-pressed="true"]'))).toHaveCount(0);

  // Buttons: compound interest 1000 × (1 + 0.05)^3.
  for (const k of ['clear', '1', '0', '0', '0', 'times', '(', '1', 'plus', '0', 'decimal point', '0', '5', ')', 'power', '3', 'equals']) {
    await calc.getByRole('button', { name: k, exact: true }).click();
  }
  await expect(result).toHaveText('1,157.625');

  // Percent like a phone calculator, and continuing from an answer.
  await page.keyboard.type('200+10%');
  await page.keyboard.press('Enter');
  await expect(result).toHaveText('220');
  await page.keyboard.type('*2=');
  await expect(result).toHaveText('440');

  // History: reuse the first result.
  const history = calc.locator('.calc-history-item');
  await expect(history).toHaveCount(4);
  await history.last().click();
  await expect(expr).toHaveText('2000');
  await page.keyboard.type('+500');
  await page.keyboard.press('Enter');
  await expect(result).toHaveText('2,500');

  // Mistakes are explained.
  await page.keyboard.type('5/0');
  await page.keyboard.press('Enter');
  await expect(result).toHaveText("Can't divide by 0.");
  await page.keyboard.press('Backspace');
  await expect(expr).toHaveText('5÷');

  // Clicking an answer works as usual, and once focus is back on the exam, shortcuts answer again.
  await options.nth(1).click();
  await expect(page.locator('.exam-count')).toHaveText('Question 2 of 3');
  await page.keyboard.press('a');
  await expect(page.locator('.exam-count')).toHaveText('Question 3 of 3');

  // The calculator keeps its history when closed and reopened.
  await calc.getByRole('button', { name: 'Close calculator' }).click();
  await expect(calc).toHaveCount(0);
  await page.keyboard.press('a');
  await expect(page.locator('.exam-count')).toHaveText('Review');
  await page.getByRole('button', { name: 'Calculator' }).click();
  await expect(calc.locator('.calc-history-item').first()).toContainText('2,500');
  await page.keyboard.press('Escape');
  await expect(calc).toHaveCount(0);

  // Also available on every other page.
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await expect(page.locator('.hero-figure')).toHaveText(/^\d\/3$/); // drills shuffle, so the score varies
  await page.getByRole('button', { name: 'Calculator' }).click();
  await expect(calc).toBeVisible();
  await expect(expr).toHaveText('5÷'); // it kept the unfinished calculation, like a real calculator
  await page.keyboard.press('Delete');
  await page.keyboard.type('2+2=');
  await expect(result).toHaveText('4');
});
