import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/lib/db.ts';
import { eraseAll, exportBackup, restoreBackup, validateBackup } from '../src/lib/backup.ts';
import {
  createSession,
  deleteExam,
  findDuplicates,
  finishSession,
  saveImportedExam,
  updateQuestion,
  type ExamMeta,
} from '../src/lib/repo.ts';
import { applyResult, MASTERY_DAYS } from '../src/lib/srs.ts';
import { computeStats, streaks } from '../src/lib/stats.ts';
import { toBlooketCsv } from '../src/lib/blooket.ts';
import { dueQuestionIds, filterQuestions } from '../src/lib/select.ts';
import { addDays, dayKey } from '../src/lib/time.ts';
import type { Attempt, Letter, Question, ReviewCard, Session } from '../src/lib/types.ts';
import { SAMPLE_QUESTIONS, type SampleQuestion } from './fixtures/sampleExam.ts';

const META: ExamMeta = { title: 'Finance 2024 District', cluster: 'Finance', year: 2024, level: 'District' };

beforeEach(async () => {
  await eraseAll();
});

describe('importing exams', () => {
  it('saves every question with its area code', async () => {
    const exam = await saveImportedExam(META, SAMPLE_QUESTIONS);
    expect(exam.questionIds).toHaveLength(100);
    expect(await db.questions.count()).toBe(100);
    const first = await db.questions.get(exam.questionIds[0]);
    expect(first?.area).toBe(SAMPLE_QUESTIONS[0].piCode.slice(0, 2));
    expect(first?.clusters).toEqual(['Finance']);
  });

  it('links repeated questions instead of copying them, even with options reordered', async () => {
    const a = await saveImportedExam(META, SAMPLE_QUESTIONS);
    const repeats: SampleQuestion[] = SAMPLE_QUESTIONS.slice(0, 20).map((q) => {
      const options = [...q.options].reverse();
      const answer = (['A', 'B', 'C', 'D'] as Letter[])[options.indexOf(q.options['ABCD'.indexOf(q.answer)])];
      return { ...q, options, answer, stem: q.stem.toUpperCase() };
    });
    const dupes = await findDuplicates(repeats);
    expect(dupes.every((d) => d && !d.answerDiffers && d.examTitles[0] === META.title)).toBe(true);

    const b = await saveImportedExam({ ...META, title: 'Business Admin 2025', cluster: 'Business Admin Core', year: 2025 }, repeats);
    expect(await db.questions.count()).toBe(100);
    expect(b.questionIds).toEqual(a.questionIds.slice(0, 20));
    const shared = await db.questions.get(a.questionIds[0]);
    expect(shared?.examIds).toEqual([a.id, b.id]);
    expect(shared?.clusters).toEqual(['Finance', 'Business Admin Core']);
    expect(shared?.years).toEqual([2024, 2025]);
  });

  it('flags a repeated question whose key gives a different answer', async () => {
    await saveImportedExam(META, SAMPLE_QUESTIONS.slice(0, 1));
    const q = SAMPLE_QUESTIONS[0];
    const other = q.answer === 'A' ? 'B' : 'A';
    const [dupe] = await findDuplicates([{ ...q, answer: other }]);
    expect(dupe?.answerDiffers).toBe(true);
  });

  it('deleting an exam keeps questions shared with other exams', async () => {
    const a = await saveImportedExam(META, SAMPLE_QUESTIONS);
    const b = await saveImportedExam({ ...META, title: 'Other', year: 2025 }, SAMPLE_QUESTIONS.slice(0, 10));
    await deleteExam(a.id);
    expect(await db.questions.count()).toBe(10);
    const q = await db.questions.get(b.questionIds[0]);
    expect(q?.examIds).toEqual([b.id]);
    expect(q?.years).toEqual([2025]);
  });

  it('refuses an edit that would make a question identical to another', async () => {
    const exam = await saveImportedExam(META, SAMPLE_QUESTIONS.slice(0, 2));
    await expect(updateQuestion(exam.questionIds[1], SAMPLE_QUESTIONS[0])).rejects.toThrow(/already has exactly/);
  });
});

describe('sessions', () => {
  it('grades a finished exam and creates mistake cards for wrong answers only', async () => {
    const exam = await saveImportedExam(META, SAMPLE_QUESTIONS);
    const s = await createSession({ mode: 'exam', title: META.title, questionIds: exam.questionIds, timeLimitSec: 4200, examId: exam.id });
    expect(s.countsAsExam).toBe(true);
    const answers: (Letter | null)[] = SAMPLE_QUESTIONS.map((q, i) => {
      if (i < 70) return q.answer; // right
      if (i < 90) return q.answer === 'A' ? 'B' : 'A'; // wrong
      return null; // blank
    });
    const done = await finishSession(s.id, 'submit', { answers, elapsedSec: 3000 });
    expect(done?.correctCount).toBe(70);
    expect(done?.status).toBe('finished');
    expect(await db.attempts.count()).toBe(100);
    expect(await db.reviews.count()).toBe(20);

    // Finishing again does nothing.
    await finishSession(s.id, 'submit');
    expect(await db.attempts.count()).toBe(100);
  });
});

describe('spaced repetition', () => {
  const today = '2026-11-01';
  const card = (patch: Partial<ReviewCard> = {}): ReviewCard => ({
    questionId: 'q',
    box: 0,
    due: today,
    lastCorrectDay: null,
    wrongCount: 1,
    lastWrongAt: 0,
    lastWrongChoice: 'A',
    mastered: false,
    ...patch,
  });

  it('needs correct answers on different days before a mistake is mastered', () => {
    let c = applyResult(undefined, 'q', 'A', false, today, 1);
    expect(c).toMatchObject({ box: 0, due: today, wrongCount: 1 });
    c = applyResult(c, 'q', 'B', true, today, 2);
    expect(c).toMatchObject({ box: 1, due: addDays(today, 1) });
    // A second correct answer the same day doesn't count.
    expect(applyResult(c, 'q', 'B', true, today, 3)).toBe(c);
    c = applyResult(c, 'q', 'B', true, addDays(today, 1), 4);
    expect(c).toMatchObject({ box: 2, due: addDays(today, 4) });
    c = applyResult(c, 'q', 'B', true, addDays(today, 4), 5);
    expect(c).toMatchObject({ box: MASTERY_DAYS, mastered: true });
  });

  it('a wrong answer resets progress', () => {
    const c = applyResult(card({ box: 2, lastCorrectDay: today, wrongCount: 2 }), 'q', 'C', false, today, 9);
    expect(c).toMatchObject({ box: 0, lastCorrectDay: null, wrongCount: 3, lastWrongChoice: 'C', mastered: false });
  });

  it('ignores correct answers to questions never missed', () => {
    expect(applyResult(undefined, 'q', 'A', true, today, 1)).toBeUndefined();
  });

  it('lists due, unmastered cards', () => {
    const cards = [
      card({ questionId: 'a', due: addDays(today, 1) }),
      card({ questionId: 'b', due: addDays(today, -2) }),
      card({ questionId: 'c', due: today }),
      card({ questionId: 'd', due: today, mastered: true }),
    ];
    expect(dueQuestionIds(cards, today)).toEqual(['b', 'c']);
  });
});

describe('stats', () => {
  const attempt = (day: string, correct: boolean, area = 'FI', chosen: Letter | null = 'A'): Attempt => ({
    sessionId: 's',
    questionId: 'q',
    chosen,
    correct,
    area,
    piCode: `${area}:001`,
    mode: 'exam',
    at: 0,
    day,
  });
  const session = (patch: Partial<Session>): Session => ({
    id: crypto.randomUUID(),
    mode: 'exam',
    title: 'x',
    questionIds: Array.from({ length: 100 }, (_, i) => String(i)),
    answers: [],
    currentIndex: 0,
    timeLimitSec: 4200,
    elapsedSec: 600,
    status: 'finished',
    countsAsExam: true,
    startedAt: 0,
    updatedAt: 0,
    finishedAt: 1,
    correctCount: 50,
    ...patch,
  });

  it('computes lifetime totals, exam scores, weakest areas and streaks', () => {
    const today = '2026-11-20';
    const attempts = [
      attempt(today, true),
      attempt(today, false),
      attempt(addDays(today, -1), true, 'BL'),
      attempt(addDays(today, -1), false, 'BL'),
      attempt(addDays(today, -1), false, 'BL'),
      attempt(addDays(today, -3), true, 'EC'),
      attempt(addDays(today, -3), false, 'EC', null), // blank: not "answered"
    ];
    const sessions = [
      session({ correctCount: 60, finishedAt: 1 }),
      session({ correctCount: 80, finishedAt: 2 }),
      session({ mode: 'drill', countsAsExam: false, questionIds: ['a'], correctCount: 1 }),
      session({ status: 'active', elapsedSec: 30 }),
    ];
    const s = computeStats(attempts, sessions, today);
    expect(s.answered).toBe(6);
    expect(s.examsCompleted).toBe(2);
    expect(s.averageScore).toBe(70);
    expect(s.bestScore).toBe(80);
    expect(s.trend.map((t) => t.pct)).toEqual([60, 80]);
    expect(s.timeSec).toBe(600 * 3 + 30);
    expect(s.areas.map((a) => [a.area, Math.round(a.pct)])).toEqual([
      ['BL', 33],
      ['FI', 50],
      ['EC', 100],
    ]);
    expect(s.streak).toBe(2);
  });

  it('keeps a streak alive until the end of today', () => {
    const today = '2026-11-20';
    const days = new Set([addDays(today, -1), addDays(today, -2), '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']);
    expect(streaks(days, today)).toEqual({ current: 2, longest: 4 });
    expect(streaks(new Set([addDays(today, -2)]), today).current).toBe(0);
  });

  it('uses local calendar days', () => {
    expect(dayKey(new Date(2026, 10, 22, 23, 59))).toBe('2026-11-22');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('drill filters', () => {
  const q = (id: string, patch: Partial<Question>): Question => ({
    id,
    fingerprint: id,
    stem: '',
    options: [],
    answer: 'A',
    explanation: '',
    source: '',
    piCode: '',
    area: 'FI',
    examIds: [],
    clusters: ['Finance'],
    years: [2024],
    createdAt: 0,
    ...patch,
  });
  const bank = [q('1', {}), q('2', { area: 'BL', years: [2023] }), q('3', { clusters: ['Marketing'], area: 'MK' })];

  it('treats empty filters as "any" and combines the rest', () => {
    const none = { clusters: [], years: [], areas: [], neverSeen: false };
    expect(filterQuestions(bank, none, new Set()).map((x) => x.id)).toEqual(['1', '2', '3']);
    expect(filterQuestions(bank, { ...none, clusters: ['Finance'], years: [2023] }, new Set()).map((x) => x.id)).toEqual(['2']);
    expect(filterQuestions(bank, { ...none, neverSeen: true }, new Set(['1'])).map((x) => x.id)).toEqual(['2', '3']);
  });
});

describe('backup', () => {
  it('round-trips everything through JSON', async () => {
    const exam = await saveImportedExam(META, SAMPLE_QUESTIONS);
    const s = await createSession({ mode: 'exam', title: 'x', questionIds: exam.questionIds, timeLimitSec: null });
    await finishSession(s.id, 'submit', { answers: exam.questionIds.map(() => 'A'), elapsedSec: 100 });
    const json = JSON.stringify(await exportBackup());

    await eraseAll();
    expect(await db.questions.count()).toBe(0);
    await restoreBackup(validateBackup(JSON.parse(json)));
    expect(await db.exams.count()).toBe(1);
    expect(await db.questions.count()).toBe(100);
    expect(await db.attempts.count()).toBe(100);
    expect(await db.reviews.count()).toBe(75);
    expect(await db.sessions.count()).toBe(1);
  });

  it('rejects files that are not backups', () => {
    expect(() => validateBackup({ hello: 1 })).toThrow("isn't a DECA Study backup");
    expect(() => validateBackup({ format: 'deca-study-backup', version: 1 })).toThrow(/damaged/);
  });
});

describe('Blooket export', () => {
  it("matches Blooket's import template and escapes text", () => {
    const csv = toBlooketCsv([{ stem: 'What is "net income", really?', options: ['a', 'b\nc', 'd', 'e'], answer: 'C' }], 45);
    expect(csv.startsWith('"Blooket\nImport Template",,,,,,,\r\nQuestion #,Question Text,Answer 1,Answer 2,"Answer 3\n(Optional)"')).toBe(true);
    expect(csv).toContain('1,"What is ""net income"", really?",a,"b\nc",d,e,45,3\r\n');
  });
});
