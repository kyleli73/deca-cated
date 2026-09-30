import { db, TABLES } from './db.ts';
import type { Attempt, Exam, Question, ReviewCard, Session, Settings } from './types.ts';

export const BACKUP_FORMAT = 'deca-study-backup';

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  exams: Exam[];
  questions: Question[];
  sessions: Session[];
  attempts: Attempt[];
  reviews: ReviewCard[];
  settings: Settings[];
}

export async function exportBackup(): Promise<Backup> {
  return db.transaction('r', [...TABLES], async () => ({
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    exams: await db.exams.toArray(),
    questions: await db.questions.toArray(),
    sessions: await db.sessions.toArray(),
    attempts: await db.attempts.toArray(),
    reviews: await db.reviews.toArray(),
    settings: await db.settings.toArray(),
  }));
}

export function backupFileName(date = new Date()): string {
  return `deca-study-backup-${date.toISOString().slice(0, 10)}.json`;
}

/** Check a parsed JSON file really is one of our backups. Throws a readable error if not. */
export function validateBackup(data: unknown): Backup {
  const b = data as Partial<Backup> | null;
  if (!b || typeof b !== 'object' || b.format !== BACKUP_FORMAT) {
    throw new Error("This file isn't a DECA Study backup.");
  }
  if (b.version !== 1) throw new Error(`This backup is from a newer version of the app (version ${String(b.version)}).`);
  for (const t of TABLES) {
    if (!Array.isArray(b[t])) throw new Error(`The backup is damaged: "${t}" is missing.`);
  }
  return b as Backup;
}

/** Replace everything on this device with the backup's contents. */
export async function restoreBackup(b: Backup): Promise<void> {
  await db.transaction('rw', [...TABLES], async () => {
    for (const t of TABLES) await db[t].clear();
    await db.exams.bulkAdd(b.exams);
    await db.questions.bulkAdd(b.questions);
    await db.sessions.bulkAdd(b.sessions);
    await db.attempts.bulkAdd(b.attempts);
    await db.reviews.bulkAdd(b.reviews);
    await db.settings.bulkAdd(b.settings);
  });
}

export async function eraseAll(): Promise<void> {
  await db.transaction('rw', [...TABLES], async () => {
    for (const t of TABLES) await db[t].clear();
  });
}
