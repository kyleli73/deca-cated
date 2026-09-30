import { isDue } from './srs.ts';
import type { Cluster, Question, ReviewCard } from './types.ts';

export function shuffle<T>(arr: readonly T[], rand: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface DrillFilters {
  clusters: Cluster[];
  years: number[];
  areas: string[];
  neverSeen: boolean;
}

/** Questions matching every filter; an empty list means "any". */
export function filterQuestions(questions: Question[], f: DrillFilters, seen: Set<string>): Question[] {
  return questions.filter(
    (q) =>
      (!f.clusters.length || q.clusters.some((c) => f.clusters.includes(c))) &&
      (!f.years.length || q.years.some((y) => f.years.includes(y))) &&
      (!f.areas.length || f.areas.includes(q.area)) &&
      (!f.neverSeen || !seen.has(q.id)),
  );
}

export function pickRandom(questions: Question[], count: number, rand?: () => number): string[] {
  return shuffle(questions, rand)
    .slice(0, count)
    .map((q) => q.id);
}

/** Due mistakes, oldest mistake first so the queue doesn't starve older cards. */
export function dueQuestionIds(cards: ReviewCard[], today: string): string[] {
  return cards
    .filter((c) => isDue(c, today))
    .sort((a, b) => a.due.localeCompare(b.due) || a.lastWrongAt - b.lastWrongAt)
    .map((c) => c.questionId);
}
