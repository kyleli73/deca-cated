export const LETTERS = ['A', 'B', 'C', 'D'] as const;
export type Letter = (typeof LETTERS)[number];

export const CLUSTERS = [
  'Finance',
  'Business Admin Core',
  'Business Management & Admin',
  'Marketing',
  'Entrepreneurship',
  'Hospitality & Tourism',
  'Personal Financial Literacy',
] as const;
export type Cluster = (typeof CLUSTERS)[number];

export const LEVELS = ['District', 'Association', 'ICDC'] as const;
export type Level = (typeof LEVELS)[number];

export interface Exam {
  id: string;
  title: string;
  cluster: Cluster;
  /** Spring year of the competition season: 2022–23 is stored as 2023. */
  year: number;
  level: Level;
  /** Question ids in exam order. */
  questionIds: string[];
  importedAt: number;
  fileName?: string;
}

export interface Question {
  id: string;
  /** Hash of the normalised stem + sorted options; unique across the bank. */
  fingerprint: string;
  stem: string;
  options: string[];
  answer: Letter;
  explanation: string;
  source: string;
  /** Performance-indicator code from the key, e.g. "FI:093". */
  piCode: string;
  /** Instructional-area prefix of piCode, e.g. "FI". Empty if unknown. */
  area: string;
  /** Every exam this question appears in (duplicates are linked, not copied). */
  examIds: string[];
  clusters: Cluster[];
  years: number[];
  createdAt: number;
}

export type SessionMode = 'exam' | 'random' | 'mistakes' | 'drill';

export interface Session {
  id: string;
  mode: SessionMode;
  title: string;
  examId?: string;
  questionIds: string[];
  answers: (Letter | null)[];
  /** Index of the question on screen; questionIds.length means the summary page. */
  currentIndex: number;
  /** null = no time limit (the clock counts up). */
  timeLimitSec: number | null;
  elapsedSec: number;
  status: 'active' | 'finished';
  /** Counts toward exams completed / average / best / trend. */
  countsAsExam: boolean;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number;
  endedBy?: 'submit' | 'time';
  correctCount?: number;
}

/** One question in one finished session. Powers every lifetime stat. */
export interface Attempt {
  id?: number;
  sessionId: string;
  questionId: string;
  chosen: Letter | null;
  correct: boolean;
  area: string;
  piCode: string;
  mode: SessionMode;
  at: number;
  /** Local calendar day, "YYYY-MM-DD". */
  day: string;
}

/** Spaced-repetition state for a question you have answered wrong. */
export interface ReviewCard {
  questionId: string;
  /** Number of different days answered correctly since the last mistake. */
  box: number;
  /** Day it is next due in Mistakes review, "YYYY-MM-DD". */
  due: string;
  lastCorrectDay: string | null;
  wrongCount: number;
  lastWrongAt: number;
  lastWrongChoice: Letter | null;
  mastered: boolean;
}

export interface Settings {
  id: 'settings';
  goal: number;
  examMinutes: number;
  secondsPerQuestion: number;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  goal: 100_000,
  examMinutes: 70,
  secondsPerQuestion: 42,
};
