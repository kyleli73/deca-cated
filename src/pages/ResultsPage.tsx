import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AreaBars } from '../components/AreaBars.tsx';
import { QuestionReview } from '../components/QuestionReview.tsx';
import { Segmented, Tile } from '../components/ui.tsx';
import { defaultMinutes, minutesToLimit, useSettings, useStartSession } from '../hooks.ts';
import { db } from '../lib/db.ts';
import { areaStats } from '../lib/stats.ts';
import { formatClock, formatDate } from '../lib/time.ts';
import type { Question } from '../lib/types.ts';

function secondsEach(sec: number): string {
  return sec < 10 ? `${sec.toFixed(1)}s` : `${Math.round(sec)}s`;
}

export default function ResultsPage() {
  const { id = '' } = useParams();
  const settings = useSettings();
  const start = useStartSession();
  const [filter, setFilter] = useState<'all' | 'wrong' | 'guessed'>('all');
  const session = useLiveQuery(() => db.sessions.get(id), [id]);
  const questions = useLiveQuery(async () => (session ? db.questions.bulkGet(session.questionIds) : undefined), [session?.id]);

  if (session === undefined || (session && !questions)) return null;
  if (!session || session.status !== 'finished') {
    return (
      <>
        <h1>Results not found</h1>
        <Link to="/">Back to Study</Link>
      </>
    );
  }

  const rows = session.questionIds
    .map((_, i) => {
      const q = questions![i];
      const chosen = session.answers[i] ?? null;
      return q ? { number: i + 1, q, chosen, correct: chosen === q.answer, guessed: !!chosen && !!session.guesses?.[i] } : null;
    })
    .filter((r): r is { number: number; q: Question; chosen: (typeof session.answers)[number]; correct: boolean; guessed: boolean } => r !== null);

  const n = session.questionIds.length;
  const correct = session.correctCount ?? 0;
  const answered = session.answers.filter(Boolean).length;
  const pctScore = n ? (correct / n) * 100 : 0;
  // Unanswered questions cost points, so they count against the area too.
  const areas = areaStats(rows.map((r) => ({ area: r.q.area, correct: r.correct, guessed: r.guessed, chosen: r.chosen ?? 'A' })));
  const wrong = rows.filter((r) => !r.correct);
  const guessedRows = rows.filter((r) => r.guessed);
  const knew = rows.filter((r) => r.correct && !r.guessed).length;
  const lucky = rows.filter((r) => r.correct && r.guessed).length;
  const sureWrong = rows.filter((r) => r.chosen && !r.correct && !r.guessed).length;
  const guessedWrong = rows.filter((r) => !r.correct && r.guessed).length;
  const retry = rows.filter((r) => !r.correct || r.guessed);
  const shown = filter === 'wrong' ? wrong : filter === 'guessed' ? guessedRows : rows;

  return (
    <div className="stack" style={{ gap: 32 }}>
      <div>
        <p className="muted small" style={{ marginBottom: 4 }}>
          {session.title} · {formatDate(session.finishedAt ?? session.updatedAt)}
        </p>
        {session.endedBy === 'time' && (
          <div className="notice warn" style={{ margin: '8px 0 16px' }}>
            Time ran out, so the exam was submitted automatically.
          </div>
        )}
        <div className="score-hero">
          <span className="hero-figure">
            {correct}/{n}
          </span>
          <span className="hero-sub">{Math.round(pctScore)}%</span>
        </div>
      </div>

      <div className="tiles">
        <Tile label="Time used" value={formatClock(session.elapsedSec)} sub={session.timeLimitSec ? `of ${formatClock(session.timeLimitSec)}` : 'no limit'} />
        <Tile label="Average per question" value={answered ? secondsEach(session.elapsedSec / answered) : '–'} sub="per answered question" />
        <Tile label="Answered" value={`${answered}/${n}`} sub={answered < n ? `${n - answered} left blank` : 'all answered'} />
        <Tile label="You knew" value={`${Math.round(n ? (knew / n) * 100 : 0)}%`} sub="right without guessing" />
      </div>

      <section className="card" aria-labelledby="how-sure">
        <div className="card-head">
          <h2 id="how-sure">How sure you were</h2>
          <span className="muted small">Mark guesses during the exam with G</span>
        </div>
        <div className="tiles">
          <Tile label="Knew it" value={String(knew)} sub="right and sure" />
          <Tile label="Lucky guesses" value={String(lucky)} sub="right, but guessed" />
          <Tile label="Sure but wrong" value={String(sureWrong)} sub="review these first" />
          <Tile label="Guessed wrong" value={String(guessedWrong)} sub="didn't know" />
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>What you know, by instructional area</h2>
          <span className="muted small">Right without guessing · weakest first</span>
        </div>
        <AreaBars areas={areas} />
      </section>

      <section>
        <div className="page-head" style={{ marginBottom: 16 }}>
          <h2>Review</h2>
          <div className="row">
            {retry.length > 0 && (
              <button
                type="button"
                className="btn small"
                onClick={() =>
                  void start({
                    mode: 'drill',
                    title: `Retry ${retry.length} missed or guessed`,
                    questionIds: retry.map((r) => r.q.id),
                    timeLimitSec: minutesToLimit(defaultMinutes(retry.length, settings)),
                  })
                }
              >
                Retry missed &amp; guessed
              </button>
            )}
            <Segmented
              label="Show"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `All (${rows.length})` },
                { value: 'wrong', label: `Wrong only (${wrong.length})` },
                { value: 'guessed', label: `Guessed (${guessedRows.length})` },
              ]}
            />
          </div>
        </div>
        <div className="review-list">
          {shown.map((r) => (
            <QuestionReview key={r.number} number={r.number} question={r.q} chosen={r.chosen} guessed={r.guessed} />
          ))}
          {shown.length === 0 && <p className="muted">{filter === 'guessed' ? 'You didn’t mark any guesses.' : 'Nothing wrong. Perfect score!'}</p>}
        </div>
      </section>

      <div className="row">
        <Link to="/" className="btn primary">
          Back to Study
        </Link>
        <Link to="/stats" className="btn">
          See stats
        </Link>
      </div>
    </div>
  );
}
