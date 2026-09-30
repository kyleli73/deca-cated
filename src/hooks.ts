import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from './lib/db.ts';
import { createSession, type NewSession } from './lib/repo.ts';
import { DEFAULT_SETTINGS, type Settings } from './lib/types.ts';

export function useSettings(): Settings {
  const stored = useLiveQuery(() => db.settings.get('settings'));
  return { ...DEFAULT_SETTINGS, ...stored };
}

/** Create a session and open the exam screen. */
export function useStartSession() {
  const navigate = useNavigate();
  return async (input: NewSession) => {
    const s = await createSession(input);
    navigate(`/session/${s.id}`);
  };
}

/** Default time limit: the exam setting for 100 questions, pro-rated otherwise. */
export function defaultMinutes(count: number, settings: Settings, full = false): number {
  if (full && count >= 100) return settings.examMinutes;
  return Math.max(1, Math.ceil((count * settings.secondsPerQuestion) / 60));
}

export function minutesToLimit(minutes: number | ''): number | null {
  return minutes === '' || minutes <= 0 ? null : Math.round(minutes * 60);
}
