import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation } from 'react-router-dom';
import { pct } from '../components/ui.tsx';
import { defaultMinutes, minutesToLimit, useSettings, useStartSession } from '../hooks.ts';
import { db } from '../lib/db.ts';
import { deleteExam } from '../lib/repo.ts';
import { examRuns } from '../lib/stats.ts';
import { formatDate } from '../lib/time.ts';

export default function LibraryPage() {
  const settings = useSettings();
  const start = useStartSession();
  const location = useLocation();
  const saved = (location.state as { saved?: string; linked?: number } | null) ?? null;
  const exams = useLiveQuery(() => db.exams.orderBy('importedAt').reverse().toArray());
  const questionCount = useLiveQuery(() => db.questions.count());
  const finished = useLiveQuery(() => db.sessions.where('status').equals('finished').toArray());

  if (!exams || questionCount === undefined || !finished) return null;
  const totalSlots = exams.reduce((n, e) => n + e.questionIds.length, 0);
  const repeats = totalSlots - questionCount;
  const runs = examRuns(finished);
  const completed = exams.filter((e) => runs.has(e.id)).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Library</h1>
          <p className="lede">
            {exams.length} exam{exams.length === 1 ? '' : 's'} · {questionCount.toLocaleString()} unique questions
            {repeats > 0 && ` (${repeats} repeats across exams are stored once)`}
            {completed > 0 && ` · ${completed} completed`}
          </p>
        </div>
        <Link to="/import" className="btn primary">
          Import exam
        </Link>
      </div>

      {saved?.saved && (
        <div className="notice" style={{ marginBottom: 20 }} role="status">
          Saved “{saved.saved}”.
          {saved.linked ? ` ${saved.linked} question${saved.linked === 1 ? ' was' : 's were'} already in your library and ${saved.linked === 1 ? 'was' : 'were'} linked instead of copied.` : ''}
        </div>
      )}

      {exams.length === 0 ? (
        <div className="empty">
          <h2>No exams yet</h2>
          <p className="muted">Import a past exam to start practising.</p>
          <Link to="/import" className="btn primary">
            Import an exam
          </Link>
        </div>
      ) : (
        <div className="exam-list">
          {exams.map((e) => {
            const run = runs.get(e.id);
            return (
              <div className="exam-row" key={e.id}>
                <div className="info">
                  <Link to={`/library/${e.id}`} className="title">
                    {e.title}
                  </Link>
                  <div className="row small" style={{ gap: 6, marginTop: 6 }}>
                    <span className="tag">{e.cluster}</span>
                    <span className="tag">{e.year}</span>
                    <span className="tag">{e.level}</span>
                    {run && <span className="tag done">Completed {run.count === 1 ? 'once' : `${run.count} times`}</span>}
                    <span className="muted">
                      {e.questionIds.length} questions · added {formatDate(e.importedAt)}
                      {run && ` · best ${pct(run.best)} · last taken ${formatDate(run.lastAt)}`}
                    </span>
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Link to={`/library/${e.id}`} className="btn small ghost">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="btn small ghost danger"
                    onClick={() => {
                      if (confirm(`Delete “${e.title}”? Questions that also appear in other exams are kept. Your past scores stay in Stats.`)) {
                        void deleteExam(e.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="btn small primary"
                    onClick={() =>
                      void start({
                        mode: 'exam',
                        title: e.title,
                        examId: e.id,
                        questionIds: e.questionIds,
                        timeLimitSec: minutesToLimit(defaultMinutes(e.questionIds.length, settings, true)),
                      })
                    }
                  >
                    Take exam
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
