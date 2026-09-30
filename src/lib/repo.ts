import { areaOf } from './areas.ts';
import { db } from './db.ts';
import { fingerprint, normalizeForMatch } from './fingerprint.ts';
import type { EditableQuestion } from './parser/issues.ts';
import { applyResult } from './srs.ts';
import { dayKey } from './time.ts';
import {
  DEFAULT_SETTINGS,
  LETTERS,
  type Attempt,
  type Cluster,
  type Exam,
  type Letter,
  type Level,
  type Question,
  type ReviewCard,
  type Session,
  type SessionMode,
  type Settings,
} from './types.ts';

const newId = () => crypto.randomUUID();

// ------------------------------------------------------------------ settings

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get('settings')) };
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  await db.settings.put({ ...(await getSettings()), ...patch, id: 'settings' });
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------- import

export interface ExamMeta {
  title: string;
  cluster: Cluster;
  year: number;
  level: Level;
  fileName?: string;
}

export interface Duplicate {
  existing: Question;
  examTitles: string[];
  /** The stored copy marks a different option text as correct. */
  answerDiffers: boolean;
}

function answerText(q: Pick<EditableQuestion, 'options' | 'answer'>): string {
  return normalizeForMatch(q.options[LETTERS.indexOf(q.answer as Letter)] ?? '');
}

/** For each question being imported, the stored question it duplicates (if any). */
export async function findDuplicates(questions: EditableQuestion[]): Promise<(Duplicate | null)[]> {
  const fps = questions.map((q) => fingerprint(q.stem, q.options));
  const found = await db.questions.where('fingerprint').anyOf(fps).toArray();
  const byFp = new Map(found.map((q) => [q.fingerprint, q]));
  const exams = new Map((await db.exams.toArray()).map((e) => [e.id, e.title]));
  return questions.map((q, i) => {
    const existing = byFp.get(fps[i]);
    if (!existing) return null;
    return {
      existing,
      examTitles: existing.examIds.map((id) => exams.get(id)).filter((t): t is string => !!t),
      answerDiffers: answerText(existing) !== answerText(q),
    };
  });
}

function toQuestionFields(q: EditableQuestion) {
  const piCode = q.piCode.trim().toUpperCase();
  return {
    stem: q.stem.trim(),
    options: q.options.map((o) => o.trim()),
    answer: q.answer as Letter,
    explanation: q.explanation.trim(),
    source: q.source.trim(),
    piCode,
    piTitle: (q.piTitle ?? '').trim(),
    area: areaOf(piCode),
    fingerprint: fingerprint(q.stem, q.options),
  };
}

/**
 * Past attempts and mistake cards store answers as letters, so a replacement
 * keeps the stored option order (a repeated question may list its options in
 * a different order) and re-letters the answer to match.
 */
function inStoredOrder<T extends { options: string[]; answer: Letter }>(fields: T, stored: Question): T {
  const incoming = fields.options.map(normalizeForMatch);
  const options = stored.options.map((o) => fields.options[incoming.indexOf(normalizeForMatch(o))]);
  if (options.some((o) => o === undefined)) return fields;
  const answerText = incoming[LETTERS.indexOf(fields.answer)];
  const answer = LETTERS[stored.options.map(normalizeForMatch).indexOf(answerText)];
  return answer ? { ...fields, options, answer } : fields;
}

/**
 * Save an exam. Questions already in the bank (same stem and options) are
 * linked to the new exam instead of copied; `replace[i]` overwrites the
 * stored copy with the imported text instead.
 */
export async function saveImportedExam(meta: ExamMeta, questions: EditableQuestion[], replace: boolean[] = []): Promise<Exam> {
  return db.transaction('rw', db.exams, db.questions, async () => {
    const exam: Exam = { id: newId(), ...meta, questionIds: [], importedAt: Date.now() };
    const byFp = new Map<string, Question>();
    for (const [i, q] of questions.entries()) {
      const fields = toQuestionFields(q);
      const existing = byFp.get(fields.fingerprint) ?? (await db.questions.where('fingerprint').equals(fields.fingerprint).first());
      let saved: Question;
      if (existing) {
        saved = {
          ...existing,
          ...(replace[i] ? inStoredOrder(fields, existing) : {}),
          examIds: [...new Set([...existing.examIds, exam.id])],
          clusters: [...new Set([...existing.clusters, meta.cluster])],
          years: [...new Set([...existing.years, meta.year])],
        };
      } else {
        saved = { id: newId(), ...fields, examIds: [exam.id], clusters: [meta.cluster], years: [meta.year], createdAt: Date.now() };
      }
      await db.questions.put(saved);
      byFp.set(saved.fingerprint, saved);
      exam.questionIds.push(saved.id);
    }
    await db.exams.add(exam);
    return exam;
  });
}

/** Recompute a question's cluster/year tags from the exams it belongs to. */
async function retag(q: Question): Promise<Question> {
  const exams = (await db.exams.bulkGet(q.examIds)).filter((e): e is Exam => !!e);
  return { ...q, clusters: [...new Set(exams.map((e) => e.cluster))], years: [...new Set(exams.map((e) => e.year))] };
}

export async function updateExamMeta(id: string, patch: Partial<ExamMeta>): Promise<void> {
  await db.transaction('rw', db.exams, db.questions, async () => {
    await db.exams.update(id, patch);
    const exam = await db.exams.get(id);
    if (!exam) return;
    const qs = (await db.questions.bulkGet(exam.questionIds)).filter((q): q is Question => !!q);
    await db.questions.bulkPut(await Promise.all(qs.map(retag)));
  });
}

/**
 * Delete an exam. Questions that also appear in other exams stay; the rest are
 * removed. Past attempts are kept so lifetime stats don't change.
 */
export async function deleteExam(id: string): Promise<void> {
  await db.transaction('rw', db.exams, db.questions, db.reviews, async () => {
    const exam = await db.exams.get(id);
    if (!exam) return;
    await db.exams.delete(id);
    const qs = (await db.questions.bulkGet([...new Set(exam.questionIds)])).filter((q): q is Question => !!q);
    for (const q of qs) {
      const examIds = q.examIds.filter((e) => e !== id);
      if (examIds.length) {
        await db.questions.put(await retag({ ...q, examIds }));
      } else {
        await db.questions.delete(q.id);
        await db.reviews.delete(q.id);
      }
    }
  });
}

export async function updateQuestion(id: string, q: EditableQuestion): Promise<void> {
  const fields = toQuestionFields(q);
  await db.transaction('rw', db.questions, async () => {
    const clash = await db.questions.where('fingerprint').equals(fields.fingerprint).first();
    if (clash && clash.id !== id) throw new Error('Another question in your library already has exactly this text and these options.');
    await db.questions.update(id, fields);
  });
}

// ----------------------------------------------------------------- sessions

export interface NewSession {
  mode: SessionMode;
  title: string;
  questionIds: string[];
  timeLimitSec: number | null;
  examId?: string;
}

export async function createSession(input: NewSession): Promise<Session> {
  const now = Date.now();
  const session: Session = {
    id: newId(),
    ...input,
    answers: input.questionIds.map(() => null),
    currentIndex: 0,
    elapsedSec: 0,
    status: 'active',
    // Full exams feed the score average/best/trend; drills and mistakes don't.
    countsAsExam: (input.mode === 'exam' || input.mode === 'random') && input.questionIds.length >= 100,
    startedAt: now,
    updatedAt: now,
  };
  await db.sessions.add(session);
  return session;
}

export async function saveProgress(id: string, patch: Pick<Session, 'answers' | 'currentIndex' | 'elapsedSec'>): Promise<void> {
  await db.sessions.where('id').equals(id).and((s) => s.status === 'active').modify({ ...patch, updatedAt: Date.now() });
}

export async function discardSession(id: string): Promise<void> {
  await db.sessions.where('id').equals(id).and((s) => s.status === 'active').delete();
}

/**
 * Grade a session: record an attempt per question, update mistake cards and
 * mark it finished. Safe to call twice (the second call is a no-op).
 */
export async function finishSession(
  id: string,
  endedBy: 'submit' | 'time',
  final?: Pick<Session, 'answers' | 'elapsedSec'>,
): Promise<Session | undefined> {
  return db.transaction('rw', [db.sessions, db.questions, db.attempts, db.reviews], async () => {
    const stored = await db.sessions.get(id);
    if (!stored || stored.status === 'finished') return stored;
    const s = { ...stored, ...final };
    const now = Date.now();
    const day = dayKey(now);
    const questions = await db.questions.bulkGet(s.questionIds);
    const cards = new Map<string, ReviewCard>();
    for (const c of await db.reviews.bulkGet(s.questionIds)) if (c) cards.set(c.questionId, c);

    const attempts: Attempt[] = [];
    let correct = 0;
    s.questionIds.forEach((qid, i) => {
      const q = questions[i];
      if (!q) return; // deleted since the session started
      const chosen = s.answers[i] ?? null;
      const ok = chosen === q.answer;
      if (ok) correct++;
      attempts.push({ sessionId: s.id, questionId: qid, chosen, correct: ok, area: q.area, piCode: q.piCode, mode: s.mode, at: now, day });
      if (chosen) {
        const next = applyResult(cards.get(qid), qid, chosen, ok, day, now);
        if (next) cards.set(qid, next);
      }
    });
    await db.attempts.bulkAdd(attempts);
    await db.reviews.bulkPut([...cards.values()]);

    const done: Session = { ...s, status: 'finished', endedBy, finishedAt: now, updatedAt: now, correctCount: correct };
    await db.sessions.put(done);
    return done;
  });
}
