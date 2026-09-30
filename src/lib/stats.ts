import { areaName } from './areas.ts';
import { addDays } from './time.ts';
import type { Attempt, Session } from './types.ts';

export interface AreaStat {
  area: string;
  name: string;
  correct: number;
  total: number;
  pct: number;
}

export interface TrendPoint {
  sessionId: string;
  at: number;
  pct: number;
  title: string;
}

export interface LifetimeStats {
  answered: number;
  correct: number;
  timeSec: number;
  examsCompleted: number;
  averageScore: number | null;
  bestScore: number | null;
  trend: TrendPoint[];
  areas: AreaStat[];
  streak: number;
  longestStreak: number;
  studiedToday: boolean;
}

export function scorePct(s: Pick<Session, 'correctCount' | 'questionIds'>): number {
  return s.questionIds.length ? ((s.correctCount ?? 0) / s.questionIds.length) * 100 : 0;
}

/** Accuracy per instructional area over answered questions, weakest first. */
export function areaStats(attempts: Pick<Attempt, 'area' | 'correct' | 'chosen'>[]): AreaStat[] {
  const by = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    if (a.chosen === null) continue;
    const s = by.get(a.area) ?? { correct: 0, total: 0 };
    s.total++;
    if (a.correct) s.correct++;
    by.set(a.area, s);
  }
  return [...by.entries()]
    .map(([area, s]) => ({ area, name: areaName(area), ...s, pct: (s.correct / s.total) * 100 }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total || a.name.localeCompare(b.name));
}

/** Current and longest run of consecutive study days. Today not studied yet doesn't break the streak. */
export function streaks(days: Set<string>, today: string): { current: number; longest: number } {
  let current = 0;
  let d = days.has(today) ? today : addDays(today, -1);
  while (days.has(d)) {
    current++;
    d = addDays(d, -1);
  }
  let longest = 0;
  for (const day of days) {
    if (days.has(addDays(day, -1))) continue; // not the start of a run
    let len = 0;
    let x = day;
    while (days.has(x)) {
      len++;
      x = addDays(x, 1);
    }
    longest = Math.max(longest, len);
  }
  return { current, longest };
}

export function computeStats(attempts: Attempt[], sessions: Session[], today: string): LifetimeStats {
  const answered = attempts.filter((a) => a.chosen !== null);
  const exams = sessions
    .filter((s) => s.status === 'finished' && s.countsAsExam)
    .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));
  const scores = exams.map(scorePct);
  const days = new Set(answered.map((a) => a.day));
  const { current, longest } = streaks(days, today);

  return {
    answered: answered.length,
    correct: answered.filter((a) => a.correct).length,
    timeSec: sessions.reduce((sum, s) => sum + s.elapsedSec, 0),
    examsCompleted: exams.length,
    averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    bestScore: scores.length ? Math.max(...scores) : null,
    trend: exams.map((s, i) => ({ sessionId: s.id, at: s.finishedAt ?? s.updatedAt, pct: scores[i], title: s.title })),
    areas: areaStats(attempts),
    streak: current,
    longestStreak: longest,
    studiedToday: days.has(today),
  };
}
