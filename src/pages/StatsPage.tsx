import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { AreaBars } from '../components/AreaBars.tsx';
import { ScoreTrend } from '../components/ScoreTrend.tsx';
import { pct, Tile } from '../components/ui.tsx';
import { useSettings } from '../hooks.ts';
import { db } from '../lib/db.ts';
import { updateSettings } from '../lib/repo.ts';
import { computeStats } from '../lib/stats.ts';
import { dayKey, formatDuration } from '../lib/time.ts';

export default function StatsPage() {
  const settings = useSettings();
  const attempts = useLiveQuery(() => db.attempts.toArray());
  const sessions = useLiveQuery(() => db.sessions.toArray());
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');

  if (!attempts || !sessions) return null;
  const s = computeStats(attempts, sessions, dayKey());
  const goalPct = Math.min(100, (s.answered / Math.max(1, settings.goal)) * 100);

  const saveGoal = () => {
    const g = Math.round(Number(goalDraft.replace(/[^\d]/g, '')));
    if (g > 0) void updateSettings({ goal: g });
    setEditingGoal(false);
  };

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div>
        <h1>Stats</h1>
        <p className="lede" style={{ marginBottom: 0 }}>
          Everything you've done in DECA Study on this device.
        </p>
      </div>

      <section className="card">
        <div className="muted small">Questions answered</div>
        <div className="hero-figure" style={{ marginTop: 6 }}>
          {s.answered.toLocaleString()}
        </div>
        <div className="goal-meter" role="progressbar" aria-valuemin={0} aria-valuemax={settings.goal} aria-valuenow={s.answered} aria-label="Progress toward goal">
          <div style={{ width: `${goalPct}%` }} />
        </div>
        <div className="row small muted">
          <span>
            {goalPct < 1 && goalPct > 0 ? '<1' : Math.floor(goalPct)}% of your {settings.goal.toLocaleString()} goal
          </span>
          <span className="spacer" />
          {editingGoal ? (
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                saveGoal();
              }}
            >
              <input
                aria-label="New goal"
                inputMode="numeric"
                value={goalDraft}
                autoFocus
                onChange={(e) => setGoalDraft(e.target.value)}
                style={{ width: 140, minHeight: 32, padding: '4px 10px' }}
              />
              <button type="submit" className="btn small primary">
                Save
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setGoalDraft(String(settings.goal));
                setEditingGoal(true);
              }}
            >
              Change goal
            </button>
          )}
        </div>
      </section>

      <div className="tiles">
        <Tile label="Time studying" value={formatDuration(s.timeSec)} />
        <Tile label="Exams completed" value={String(s.examsCompleted)} sub="full 100-question exams" />
        <Tile label="Average score" value={pct(s.averageScore)} />
        <Tile label="Best score" value={pct(s.bestScore)} />
        <Tile
          label="Day streak"
          value={`${s.streak} day${s.streak === 1 ? '' : 's'}`}
          sub={s.streak > 0 && !s.studiedToday ? 'Study today to keep it' : `Longest: ${s.longestStreak}`}
        />
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Score trend</h2>
          <span className="muted small">Full exams, oldest to newest</span>
        </div>
        <ScoreTrend points={s.trend} />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Accuracy by instructional area</h2>
          <span className="muted small">All modes · weakest first</span>
        </div>
        <AreaBars areas={s.areas} />
      </section>
    </div>
  );
}
