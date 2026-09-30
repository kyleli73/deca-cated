import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { SAMPLE_QUESTIONS } from '../tests/fixtures/sampleExam.ts';
import type { Letter } from '../src/lib/types.ts';

const PDF = 'samples/finance-sample-exam.pdf';
const PASTED = readFileSync('samples/finance-sample-exam-pasted.txt', 'utf8');
const wrongOf = (l: Letter): Letter => (['B', 'C', 'D', 'A'] as Letter[])['ABCD'.indexOf(l)];
const answerFor = (stem: string) => SAMPLE_QUESTIONS.find((q) => q.stem === stem)!.answer;
const tile = (page: Page, label: string) => page.locator('.tile').filter({ has: page.locator('.label', { hasText: new RegExp(`^${label}$`) }) });

async function importPdf(page: Page, year = '2025') {
  await page.goto('/#/import');
  await page.getByTestId('file-input').setInputFiles(PDF);
  await expect(page.getByRole('heading', { name: 'Check the questions' })).toBeVisible();
  await page.getByLabel('Year').fill(year);
  await page.getByRole('button', { name: 'Save exam' }).click();
  await expect(page.getByText(/^Saved “/)).toBeVisible();
}

async function pasteExam(page: Page, text: string) {
  await page.goto('/#/import');
  await page.getByLabel('Exam text').fill(text);
  await page.getByRole('button', { name: 'Read exam' }).click();
  await expect(page.getByRole('heading', { name: 'Check the questions' })).toBeVisible();
}

const SMALL_EXAM = `FINANCE CLUSTER EXAM
1. Which is a current asset?
A. Equipment
B. Accounts receivable
C. Mortgage payable
D. Retained earnings
2. A budget is a
A. financial plan
B. tax form
C.
D. bank statement
3. Collateral is
A. a pledged asset
B. interest
C. principal
D. equity
ANSWER KEY
1. B
Receivables are current assets.
SOURCE: FI:073
3. A
Collateral secures a loan.
SOURCE: FI:043`;

test('full exam run-through: import a PDF, take the exam, review, stats and mistakes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Add your first exam' })).toBeVisible();
  await page.getByRole('link', { name: 'Import an exam' }).click();
  await page.getByTestId('file-input').setInputFiles(PDF);
  await expect(page.getByRole('heading', { name: 'Check the questions' })).toBeVisible();
  await expect(page.locator('.tag', { hasText: '100 questions' })).toBeVisible();
  await expect(page.getByText('need fixing')).toHaveCount(0);
  // Tags come from the cover page ("for State/Province Use", "2025-2026 Competitive Events Program").
  await expect(page.getByLabel('Year')).toHaveValue('2026');
  await expect(page.getByLabel('Level')).toHaveValue('Association');
  await expect(page.getByText('Title will be “Finance 2026 Association · Test 9123”')).toBeVisible();
  await page.getByLabel('Year').fill('');
  await expect(page.getByRole('button', { name: 'Save exam' })).toBeDisabled(); // year is required
  await page.getByLabel('Year').fill('2025');
  await page.getByLabel('Level').selectOption('District');
  await page.getByRole('button', { name: 'Save exam' }).click();
  await expect(page.getByText('Saved “Finance 2025 District · Test 9123”.')).toBeVisible();
  await expect(page.getByText('1 exam · 100 unique questions')).toBeVisible();

  // Start the stored exam: 70:00 countdown, question 1.
  await page.getByRole('link', { name: 'Study', exact: true }).click();
  await page.getByRole('button', { name: 'Start exam' }).click();
  await expect(page.getByText('Question 1 of 100')).toBeVisible();
  await expect(page.getByRole('timer')).toContainText(/1:(10:00|09:5\d)/);

  // 80 right, 15 wrong, 5 left blank. Answer with the keyboard; it auto-advances.
  const plan = SAMPLE_QUESTIONS.map((q, i) => (i < 80 ? q.answer : i < 95 ? wrongOf(q.answer) : null));
  for (let i = 0; i < 100; i++) {
    if (i === 50) {
      await page.getByRole('link', { name: /Save & exit/ }).click();
      await expect(page.getByText('Unfinished: Finance 2025 District · Test 9123')).toBeVisible();
      await expect(page.getByText(/50 of 100 answered/)).toBeVisible();
      await page.getByRole('link', { name: 'Resume' }).click();
      await expect(page.getByText('Question 51 of 100')).toBeVisible();
    }
    const a = plan[i];
    await page.keyboard.press(a ? a.toLowerCase() : 'ArrowRight');
    await expect(page.locator('.exam-count')).toHaveText(i === 99 ? 'Review' : `Question ${i + 2} of 100`);
  }
  // No feedback during the exam: nothing marks right or wrong.
  await expect(page.getByText(/Correct/)).toHaveCount(0);

  await expect(page.getByText("You've answered 95 of 100 questions.")).toBeVisible();
  await expect(page.getByRole('button', { name: '96', exact: true })).toBeVisible(); // listed as unanswered

  // Revisit question 3 from the grid, change the answer by clicking, then change it back.
  await page.getByRole('button', { name: 'Question 3, answered' }).click();
  await expect(page.locator('.exam-count')).toHaveText('Question 3 of 100');
  const options = page.getByRole('group', { name: 'Answer options' }).getByRole('button');
  await expect(options.nth('ABCD'.indexOf(plan[2]!))).toHaveAttribute('aria-pressed', 'true');
  await options.nth('ABCD'.indexOf(wrongOf(plan[2]!))).click();
  await expect(page.locator('.exam-count')).toHaveText('Question 4 of 100');
  await page.getByRole('button', { name: '← Back' }).click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.exam-count')).toHaveText('Question 3 of 100');
  await page.keyboard.press(plan[2]!.toLowerCase());
  await expect(page.locator('.exam-count')).toHaveText('Question 4 of 100');

  await page.locator('.kbd-hint').getByRole('button', { name: 'Review & submit' }).click();
  await page.getByRole('button', { name: 'Submit exam' }).click();

  // Results
  await expect(page.locator('.hero-figure')).toHaveText('80/100');
  await expect(page.locator('.hero-sub')).toHaveText('80%');
  await expect(tile(page, 'Answered')).toContainText('95/100');
  await expect(tile(page, 'Average per question')).toContainText('s');
  await expect(page.getByRole('table', { name: 'Accuracy by instructional area' })).toBeVisible();
  await expect(page.locator('.review-item')).toHaveCount(100);
  await page.getByRole('button', { name: 'Wrong only (20)' }).click();
  await expect(page.locator('.review-item')).toHaveCount(20);
  const firstWrong = page.locator('.review-item').first();
  await expect(firstWrong).toContainText(SAMPLE_QUESTIONS[80].explanation);
  await expect(firstWrong.locator('.review-opt.correct')).toContainText('Correct answer');
  await expect(firstWrong.locator('.review-opt.wrong')).toContainText('Your answer');
  await expect(page.locator('.review-item', { hasText: SAMPLE_QUESTIONS[97].stem })).toContainText('Not answered');

  // Stats
  await page.getByRole('link', { name: 'Stats', exact: true }).click();
  await expect(page.locator('.hero-figure')).toHaveText('95');
  await expect(page.getByText('<1% of your 100,000 goal')).toBeVisible();
  await expect(tile(page, 'Exams completed')).toContainText('1');
  await expect(tile(page, 'Average score')).toContainText('80%');
  await expect(tile(page, 'Best score')).toContainText('80%');
  await expect(tile(page, 'Day streak')).toContainText('1 day');
  await expect(page.getByRole('img', { name: /Score trend over 1 exams. Latest 80%/ })).toBeVisible();
  await page.getByRole('button', { name: 'Change goal' }).click();
  await page.getByRole('textbox', { name: 'New goal' }).fill('500');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('19% of your 500 goal')).toBeVisible();

  // Library shows the exam as completed, with how many times and the best score.
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByText('1 exam · 100 unique questions · 1 completed')).toBeVisible();
  const row = page.locator('.exam-row', { hasText: 'Finance 2025 District · Test 9123' });
  await expect(row.locator('.tag.done')).toHaveText('Completed once');
  await expect(row).toContainText('best 80% · last taken');

  // Mistakes review: the 15 wrong answers are due today (blanks aren't mistakes).
  await page.getByRole('link', { name: 'Study', exact: true }).click();
  const mistakes = page.locator('section', { has: page.getByRole('heading', { name: 'Mistakes review' }) });
  await expect(mistakes).toContainText('15 due today');
  await mistakes.getByRole('button', { name: 'Review 15 mistakes' }).click();
  for (let i = 0; i < 15; i++) {
    const stem = await page.locator('h1.stem').textContent();
    await page.keyboard.press(answerFor(stem!).toLowerCase());
    await expect(page.locator('.exam-count')).toHaveText(i === 14 ? 'Review' : `Question ${i + 2} of 15`);
  }
  await page.getByRole('button', { name: 'Submit exam' }).click();
  await expect(page.locator('.hero-figure')).toHaveText('15/15');

  // Right once today: still learning, and not due again today.
  await page.getByRole('link', { name: 'Study', exact: true }).click();
  await expect(mistakes).toContainText('0 due today');
  await expect(mistakes).toContainText('15 still learning');

  // Wrong answers page and the Blooket export.
  await page.getByRole('link', { name: 'Wrong answers', exact: true }).click();
  await expect(page.locator('.review-item')).toHaveCount(15);
  await expect(page.locator('.review-item').first()).toContainText('Right on 1 of 3 days');
  await expect(page.locator('.review-item').first()).toContainText('Your last wrong answer');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download for Blooket (.csv)' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^deca-wrong-answers-blooket-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = readFileSync(await download.path(), 'utf8');
  expect(csv.startsWith('"Blooket\nImport Template",,,,,,,\r\nQuestion #,Question Text,Answer 1,Answer 2,')).toBe(true);
  expect(csv.trim().split('\r\n')).toHaveLength(2 + 15);

  // Stats now include the mistakes session.
  await page.getByRole('link', { name: 'Stats', exact: true }).click();
  await expect(page.locator('.hero-figure')).toHaveText('110');
  await expect(tile(page, 'Exams completed')).toContainText('1');

  expect(errors).toEqual([]);
});

test('import review flags problems, and repeated questions are linked instead of copied', async ({ page }) => {
  await pasteExam(page, SMALL_EXAM);
  await expect(page.getByText('Found 3 questions. DECA exams usually have 100.')).toBeVisible();
  await expect(page.locator('.tag', { hasText: 'need fixing' })).toHaveText('1 need fixing');
  const q2 = page.getByTestId('qedit-2');
  await expect(q2).toContainText('Option C is empty.');
  await expect(q2).toContainText('No correct answer. Pick one.');
  await page.getByLabel('Year').fill('2024');
  await expect(page.getByRole('button', { name: 'Save exam' })).toBeDisabled();
  // "Only flagged" keeps a question on screen while it's being fixed.
  await page.getByRole('button', { name: 'Only flagged (1)' }).click();
  await expect(page.locator('.qedit')).toHaveCount(1);
  await q2.getByLabel('Option C').fill('receipt');
  await q2.getByLabel('A is correct').check();
  await expect(q2).toBeVisible();
  await expect(page.locator('.tag', { hasText: 'need fixing' })).toHaveCount(0);
  await expect(q2).toContainText('No explanation.'); // optional warnings remain
  await expect(page.getByRole('button', { name: 'Save exam' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save exam' }).click();
  await expect(page.getByText('Saved “Finance 2024 District”.')).toBeVisible();

  // The same 100 questions from a PDF and from messy pasted text: stored once.
  await importPdf(page, '2025');
  await pasteExam(page, PASTED);
  await expect(page.locator('.tag', { hasText: 'questions' }).first()).toHaveText('100 questions');
  await expect(page.locator('.tag', { hasText: 'already in your library' })).toHaveText('100 already in your library');
  await page.getByLabel('Year').fill('2023');
  await page.getByLabel('Level').selectOption('Association');
  await page.getByRole('button', { name: 'Save exam' }).click();
  await expect(page.getByText('100 questions were already in your library and were linked instead of copied.')).toBeVisible();
  await expect(page.getByText('3 exams · 103 unique questions (100 repeats across exams are stored once)')).toBeVisible();

  // Drill filters see both years for the linked questions.
  await page.getByRole('link', { name: 'Study', exact: true }).click();
  const drill = page.locator('section', { has: page.getByRole('heading', { name: 'Custom drill' }) });
  await drill.getByRole('group', { name: 'Year' }).getByRole('button', { name: '2023' }).click();
  await expect(drill).toContainText('100 match');
  await drill.getByRole('group', { name: 'Instructional area' }).getByRole('button', { name: 'Business Law' }).click();
  await expect(drill).toContainText('8 match');
});

test('the timer submits automatically at 0:00', async ({ page }) => {
  await page.clock.install();
  await pasteExam(page, SMALL_EXAM.replace('C.\n', 'C. receipt\n').replace('3. A\n', '2. A\nBudgets.\nSOURCE: FI:106\n3. A\n'));
  await page.getByLabel('Year').fill('2024');
  await page.getByRole('button', { name: 'Save exam' }).click();
  await expect(page.getByText(/^Saved “/)).toBeVisible();

  await page.getByRole('link', { name: 'Study', exact: true }).click();
  const drill = page.locator('section', { has: page.getByRole('heading', { name: 'Custom drill' }) });
  await drill.getByLabel('Number of questions').fill('3');
  await drill.getByLabel('Time limit (minutes)').fill('1');
  await drill.getByRole('button', { name: 'Start drill' }).click();
  await expect(page.getByRole('timer')).toContainText('1:00');
  await page.keyboard.press('a');
  await expect(page.locator('.exam-count')).toHaveText('Question 2 of 3');
  await page.clock.fastForward('01:05');
  await expect(page.getByText('Time ran out, so the exam was submitted automatically.')).toBeVisible();
  await expect(tile(page, 'Answered')).toContainText('1/3');
  await expect(tile(page, 'Time used')).toContainText('1:00');
});

test('backup: download, erase, restore', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await importPdf(page);
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup (.json)' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^deca-cated-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();
  expect(JSON.parse(readFileSync(file, 'utf8')).questions).toHaveLength(100);

  await page.getByRole('button', { name: 'Erase all data' }).click();
  await expect(page.getByText('All data erased.')).toBeVisible();
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByText('0 exams · 0 unique questions')).toBeVisible();

  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByTestId('backup-input').setInputFiles(file);
  await expect(page.getByText(/Restored 1 exams and 100 questions/)).toBeVisible();
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByText('1 exam · 100 unique questions')).toBeVisible();

  // A file that isn't a backup is rejected without touching the data.
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByTestId('backup-input').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') });
  await expect(page.getByText("This file isn't a deca-cated backup.")).toBeVisible();
});
