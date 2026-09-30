import Dexie, { type EntityTable } from 'dexie';
import type { Attempt, Exam, Question, ReviewCard, Session, Settings } from './types.ts';

export type StudyDB = Dexie & {
  exams: EntityTable<Exam, 'id'>;
  questions: EntityTable<Question, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  attempts: EntityTable<Attempt, 'id'>;
  reviews: EntityTable<ReviewCard, 'questionId'>;
  settings: EntityTable<Settings, 'id'>;
};

export const TABLES = ['exams', 'questions', 'sessions', 'attempts', 'reviews', 'settings'] as const;

export function openDB(name = 'deca-study'): StudyDB {
  const db = new Dexie(name) as StudyDB;
  db.version(1).stores({
    exams: 'id, cluster, year, level, importedAt',
    questions: 'id, &fingerprint, area, *examIds, *clusters, *years',
    sessions: 'id, status, mode, finishedAt',
    attempts: '++id, sessionId, questionId, day, area',
    reviews: 'questionId, due',
    settings: 'id',
  });
  return db;
}

export const db = openDB();
