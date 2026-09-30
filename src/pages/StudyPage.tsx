import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chips, MinutesField, Segmented } from '../components/ui.tsx';
import { defaultMinutes, minutesToLimit, useSettings, useStartSession } from '../hooks.ts';
import { areaName } from '../lib/areas.ts';
import { db } from '../lib/db.ts';
import { discardSession } from '../lib/repo.ts';
import { dueQuestionIds, filterQuestions, pickRandom, shuffle, type DrillFilters } from '../lib/select.ts';
import { dayKey, formatClock, formatDay } from '../lib/time.ts';
import { CLUSTERS, type Cluster, type Exam, type Question, type ReviewCard, type Session, type Settings } from '../lib/types.ts';

function daysUntil(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000);
}

export default function StudyPage() {
  const settings = useSettings();
  const exams = useLiveQuery(() => db.exams.orderBy('importedAt').reverse().toArray());
  const questions = useLiveQuery(() => db.questions.toArray());
  const active = useLiveQuery(() => db.sessions.where('status').equals('active').reverse().sortBy('updatedAt'));
  const reviews = useLiveQuery(() => db.reviews.toArray());
  const seen = useLiveQuery(async () => new Set((await db.attempts.orderBy('questionId').uniqueKeys()) as string[]));

  if (!exams || !questions || !active || !reviews || !seen) return null;

  const days = settings.eventDate ? daysUntil(settings.eventDate) : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Study</h1>
          {days !== null && days >= 0 && (
            <p className="countdown">
              <strong>{days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'}`}</strong>
              {days === 0 ? `is ${settings.eventName}. Good luck!` : `until ${settings.eventName} · ${formatDay(settings.eventDate)}`}
            </p>
          )}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="empty">
          <h2>Add your first exam</h2>
          <p className="muted">Drop in a past DECA exam PDF or paste its text. Everything stays on this device.</p>
          <Link to="/import" className="btn primary big" style={{ marginTop: 12 }}>
            Import an exam
          </Link>
        </div>
      ) : (
        <div className="mode-grid">
          {active.map((s) => (
            <ResumeBanner key={s.id} session={s} />
          ))}
          <FullExamCard exams={exams} questions={questions} settings={settings} />
          <MistakesCard reviews={reviews} settings={settings} />
          <DrillCard questions={questions} seen={seen} settings={settings} />
        </div>
      )}
    </>
  );
}

function ResumeBanner({ session }: { session: Session }) {
  const answered = session.answers.filter(Boolean).length;
  const left = session.timeLimitSec === null ? null : session.timeLimitSec - session.elapsedSec;
  return (
    <div className="resume">
      <div style={{ flex: 1, minWidth: 200 }}>
        <strong>Unfinished: {session.title}</strong>
        <div className="muted small">
          {answered} of {session.questionIds.length} answered
          {left !== null && ` · ${formatClock(left)} left`}
        </div>
      </div>
      <button
        type="button"
        className="btn ghost small"
        onClick={() => {
          if (confirm('Discard this unfinished session? Your answers in it will be lost.')) void discardSession(session.id);
        }}
      >
        Discard
      </button>
      <Link to={`/session/${session.id}`} className="btn primary">
        Resume
      </Link>
    </div>
  );
}

function examLabel(e: Exam): string {
  return `${e.title} · ${e.questionIds.length} questions`;
}

function FullExamCard({ exams, questions, settings }: { exams: Exam[]; questions: Question[]; settings: Settings }) {
  const start = useStartSession();
  const [kind, setKind] = useState<'stored' | 'random'>(exams.length ? 'stored' : 'random');
  const [examId, setExamId] = useState(exams[0]?.id ?? '');
  const available = useMemo(() => CLUSTERS.filter((c) => questions.some((q) => q.clusters.includes(c))), [questions]);
  const [clusters, setClusters] = useState<Cluster[]>(available.slice(0, 1));
  // null = automatic (the exam time limit, pro-rated for shorter exams)
  const [minutes, setMinutes] = useState<number | '' | null>(null);

  const exam = exams.find((e) => e.id === examId) ?? exams[0];
  const pool = questions.filter((q) => !clusters.length || q.clusters.some((c) => clusters.includes(c)));
  const count = kind === 'stored' ? (exam?.questionIds.length ?? 0) : Math.min(100, pool.length);
  const effectiveMinutes = minutes ?? defaultMinutes(count, settings, true);

  const onStart = () => {
    const timeLimitSec = minutesToLimit(effectiveMinutes);
    if (kind === 'stored' && exam) {
      void start({ mode: 'exam', title: exam.title, examId: exam.id, questionIds: exam.questionIds, timeLimitSec });
    } else {
      const title = `Random ${count} · ${clusters.length ? clusters.join(', ') : 'all clusters'}`;
      void start({ mode: 'random', title, questionIds: pickRandom(pool, 100), timeLimitSec });
    }
  };

  return (
    <section className="card" aria-labelledby="full-exam">
      <div className="card-head">
        <div>
          <h2 id="full-exam">Full exam</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Exam conditions: one question at a time, no feedback until you submit.
          </p>
        </div>
        <Segmented
          label="Exam type"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'stored', label: 'A stored exam' },
            { value: 'random', label: 'Random 100' },
          ]}
        />
      </div>
      <div className="form-grid">
        {kind === 'stored' ? (
          exams.length ? (
            <label className="field">
              Exam
              <select value={exam?.id} onChange={(e) => setExamId(e.target.value)}>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {examLabel(e)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="muted">No stored exams yet.</p>
          )
        ) : (
          <div className="field">
            <span>Clusters</span>
            <Chips label="Clusters" options={available} value={clusters} onChange={setClusters} />
            <span className="field-hint">
              {pool.length} questions available
              {pool.length < 100 && pool.length > 0 && ` · the exam will have ${pool.length}`}
            </span>
          </div>
        )}
        <div className="fields">
          <MinutesField value={effectiveMinutes} onChange={setMinutes} />
        </div>
      </div>
      <div className="start-row">
        <button type="button" className="btn primary big" disabled={count === 0} onClick={onStart}>
          Start exam
        </button>
        <span className="muted small">{count} questions</span>
      </div>
    </section>
  );
}

function MistakesCard({ reviews, settings }: { reviews: ReviewCard[]; settings: Settings }) {
  const start = useStartSession();
  const today = dayKey();
  const due = dueQuestionIds(reviews, today);
  const learning = reviews.filter((r) => !r.mastered).length;
  const learned = reviews.length - learning;
  const [limit, setLimit] = useState<number | ''>(25);
  const n = Math.min(due.length, limit === '' ? due.length : limit);
  const [minutes, setMinutes] = useState<number | '' | null>(null);
  const effectiveMinutes = minutes ?? defaultMinutes(n, settings);
  const nextDue = reviews
    .filter((r) => !r.mastered && r.due > today)
    .map((r) => r.due)
    .sort()[0];

  return (
    <section className="card" aria-labelledby="mistakes">
      <div className="card-head">
        <div>
          <h2 id="mistakes">Mistakes review</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Questions you got wrong come back until you get them right on 3 different days.
          </p>
        </div>
        <Link to="/mistakes" className="small">
          See all wrong answers →
        </Link>
      </div>
      <div className="mode-meta">
        <span>
          <strong style={{ color: 'var(--ink)' }}>{due.length}</strong> due today
        </span>
        <span>{learning} still learning</span>
        <span>{learned} learned</span>
      </div>
      {due.length ? (
        <>
          <div className="fields form-grid">
            <label className="field">
              Questions
              <input type="number" min={1} max={due.length} value={limit} onChange={(e) => setLimit(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))} />
              <span className="field-hint">Up to {due.length} due</span>
            </label>
            <MinutesField value={effectiveMinutes} onChange={setMinutes} />
          </div>
          <div className="start-row">
            <button
              type="button"
              className="btn primary big"
              onClick={() =>
                void start({ mode: 'mistakes', title: 'Mistakes review', questionIds: shuffle(due.slice(0, n)), timeLimitSec: minutesToLimit(effectiveMinutes) })
              }
            >
              Review {n} mistake{n === 1 ? '' : 's'}
            </button>
          </div>
        </>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          {reviews.length === 0
            ? 'No mistakes yet. Questions you miss will show up here.'
            : nextDue
              ? `Nothing due today. The next one comes back on ${formatDay(nextDue)}.`
              : 'Every mistake is learned. Nice work.'}
        </p>
      )}
    </section>
  );
}

function DrillCard({ questions, seen, settings }: { questions: Question[]; seen: Set<string>; settings: Settings }) {
  const start = useStartSession();
  const [f, setF] = useState<DrillFilters>({ clusters: [], years: [], areas: [], neverSeen: false });
  const [count, setCount] = useState<number | ''>(25);
  const [minutes, setMinutes] = useState<number | '' | null>(null);

  const clusters = CLUSTERS.filter((c) => questions.some((q) => q.clusters.includes(c)));
  const years = [...new Set(questions.flatMap((q) => q.years))].sort((a, b) => b - a);
  const areas = [...new Set(questions.map((q) => q.area))].sort((a, b) => areaName(a).localeCompare(areaName(b)));
  const matches = filterQuestions(questions, f, seen);
  const n = Math.min(matches.length, count === '' ? 0 : count);
  const effectiveMinutes = minutes ?? defaultMinutes(n, settings);

  return (
    <section className="card" aria-labelledby="drill">
      <div className="card-head">
        <div>
          <h2 id="drill">Custom drill</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Pick what to practise. Leave a filter empty to include everything.
          </p>
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <span>Cluster</span>
          <Chips label="Cluster" options={clusters} value={f.clusters} onChange={(v) => setF({ ...f, clusters: v })} />
        </div>
        <div className="field">
          <span>Year</span>
          <Chips label="Year" options={years} value={f.years} onChange={(v) => setF({ ...f, years: v })} />
        </div>
        <div className="field">
          <span>Instructional area</span>
          <Chips label="Instructional area" options={areas} value={f.areas} onChange={(v) => setF({ ...f, areas: v })} format={(a) => areaName(a)} />
        </div>
        <label className="check">
          <input type="checkbox" checked={f.neverSeen} onChange={(e) => setF({ ...f, neverSeen: e.target.checked })} />
          Only questions I've never seen
        </label>
        <div className="fields">
          <label className="field">
            Number of questions
            <input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))} />
            <span className="field-hint">{matches.length} match</span>
          </label>
          <MinutesField value={effectiveMinutes} onChange={setMinutes} />
        </div>
      </div>
      <div className="start-row">
        <button
          type="button"
          className="btn primary big"
          disabled={n === 0}
          onClick={() => void start({ mode: 'drill', title: `Drill · ${n} questions`, questionIds: pickRandom(matches, n), timeLimitSec: minutesToLimit(effectiveMinutes) })}
        >
          Start drill
        </button>
        <span className="muted small">{n} questions</span>
      </div>
    </section>
  );
}
