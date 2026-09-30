import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../lib/db.ts';
import { finishSession, saveProgress } from '../lib/repo.ts';
import { formatClock } from '../lib/time.ts';
import { LETTERS, type Letter, type Question, type Session } from '../lib/types.ts';

const ADVANCE_MS = 160;
const KEYS: Record<string, Letter> = { a: 'A', b: 'B', c: 'C', d: 'D', '1': 'A', '2': 'B', '3': 'C', '4': 'D' };

const MISSING: Question = {
  id: '',
  fingerprint: '',
  stem: 'This question was deleted from your library. Skip it.',
  options: [],
  answer: 'A',
  explanation: '',
  source: '',
  piCode: '',
  area: '',
  examIds: [],
  clusters: [],
  years: [],
  createdAt: 0,
};

export default function ExamPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{ session: Session; questions: Question[] } | null | undefined>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await db.sessions.get(id);
      if (cancelled) return;
      if (!session) return setData(null);
      if (session.status === 'finished') return navigate(`/results/${id}`, { replace: true });
      const qs = await db.questions.bulkGet(session.questionIds);
      if (!cancelled) setData({ session, questions: qs.map((q) => q ?? MISSING) });
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (data === undefined) return null;
  if (data === null) {
    return (
      <main className="page">
        <h1>Session not found</h1>
        <p className="muted">It may have been discarded.</p>
        <Link to="/">Back to Study</Link>
      </main>
    );
  }
  return <ExamRunner session={data.session} questions={data.questions} />;
}

function ExamRunner({ session, questions }: { session: Session; questions: Question[] }) {
  const navigate = useNavigate();
  const n = questions.length;
  const limit = session.timeLimitSec;

  const [answers, setAnswers] = useState<(Letter | null)[]>(session.answers);
  const [index, setIndex] = useState(Math.min(session.currentIndex, n));
  const [, setTick] = useState(0);
  const [saveError, setSaveError] = useState('');
  const answersRef = useRef(answers);
  const indexRef = useRef(index);
  const lockRef = useRef(false);
  const finishingRef = useRef(false);

  // Elapsed time: stored seconds + time since this page opened.
  const baseRef = useRef(session.elapsedSec);
  const openedAt = useRef(performance.now());
  const elapsedNow = useCallback(() => baseRef.current + (performance.now() - openedAt.current) / 1000, []);

  const persist = useCallback(() => {
    if (finishingRef.current) return;
    void saveProgress(session.id, {
      answers: answersRef.current,
      currentIndex: indexRef.current,
      elapsedSec: Math.round(elapsedNow()),
    });
  }, [session.id, elapsedNow]);

  const finish = useCallback(
    async (endedBy: 'submit' | 'time') => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      const elapsed = Math.round(limit === null ? elapsedNow() : Math.min(limit, elapsedNow()));
      try {
        await finishSession(session.id, endedBy, { answers: answersRef.current, elapsedSec: elapsed });
        navigate(`/results/${session.id}`, { replace: true });
      } catch (e) {
        // Stay on the exam with autosave back on; Submit retries.
        finishingRef.current = false;
        setSaveError(`Couldn't save your results${e instanceof Error ? `: ${e.message}` : ''}. Your answers are still here. Try submitting again.`);
        indexRef.current = n;
        setIndex(n);
      }
    },
    [session.id, limit, n, elapsedNow, navigate],
  );

  const go = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(n, i));
      indexRef.current = next;
      setIndex(next);
      window.scrollTo({ top: 0 });
    },
    [n],
  );

  const choose = useCallback(
    (letter: Letter) => {
      const at = indexRef.current;
      if (lockRef.current || at >= n) return;
      if (LETTERS.indexOf(letter) >= questions[at].options.length) return;
      const next = [...answersRef.current];
      next[at] = letter;
      answersRef.current = next;
      setAnswers(next);
      persist();
      lockRef.current = true;
      setTimeout(() => {
        lockRef.current = false;
        go(at + 1);
      }, ADVANCE_MS);
    },
    [n, questions, persist, go],
  );

  // Clock: re-render 4×/s; auto-submit at zero.
  useEffect(() => {
    const t = setInterval(() => {
      setTick((x) => x + 1);
      // After a failed save, wait for the user to retry instead of hammering it.
      if (limit !== null && elapsedNow() >= limit && !saveError) void finish('time');
    }, 250);
    return () => clearInterval(t);
  }, [limit, elapsedNow, finish, saveError]);

  // Save progress regularly and whenever the page is hidden or left.
  useEffect(() => {
    const t = setInterval(persist, 5000);
    const onHide = () => document.visibilityState === 'hidden' && persist();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', persist);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', persist);
      persist();
    };
  }, [persist]);

  useEffect(() => {
    persist();
  }, [index, persist]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      const letter = KEYS[e.key.toLowerCase()];
      if (letter && indexRef.current < n) {
        e.preventDefault();
        choose(letter);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(indexRef.current - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(indexRef.current + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n, choose, go]);

  const elapsed = elapsedNow();
  const remaining = limit === null ? null : Math.max(0, limit - elapsed);
  const answeredCount = answers.filter(Boolean).length;
  const onSummary = index >= n;
  const q = questions[index];

  return (
    <div className="exam-shell">
      <header className="exam-bar">
        <div className="exam-bar-inner">
          <div className="exam-title">
            <Link
              to="/"
              className="btn ghost small"
              onClick={persist}
              title="Your answers and time are saved. Resume from the Study page."
            >
              <span className="swap-label" data-short="← Exit">
                ← Save &amp; exit
              </span>
            </Link>
            <span>{session.title}</span>
          </div>
          <div className="exam-count swap-label" aria-live="polite" data-short={onSummary ? 'Review' : `${index + 1} / ${n}`}>
            {onSummary ? 'Review' : `Question ${index + 1} of ${n}`}
          </div>
          <div className={`timer${remaining !== null && remaining <= 60 ? ' low' : ''}`} role="timer" aria-label="Time">
            <span className="timer-label">{remaining === null ? 'Elapsed' : 'Left'}</span>
            {formatClock(remaining ?? elapsed)}
          </div>
        </div>
        <div className="exam-progress" aria-hidden="true">
          <div style={{ width: `${(answeredCount / n) * 100}%` }} />
        </div>
      </header>

      <main className="exam-main">
        {saveError && (
          <div className="notice bad" role="alert" style={{ marginBottom: 24 }}>
            {saveError}
          </div>
        )}
        {onSummary ? (
          <Summary answers={answers} n={n} onGo={go} onSubmit={() => void finish('submit')} index={index} />
        ) : (
          <>
            <div className="qnum">Question {index + 1}</div>
            <h1 className="stem">{q.stem}</h1>
            <div className="options" role="group" aria-label="Answer options">
              {q.options.map((o, i) => {
                const letter = LETTERS[i];
                const selected = answers[index] === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    className={`option${selected ? ' selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => choose(letter)}
                  >
                    <span className="letter">{letter}</span>
                    <span className="text">{o}</span>
                  </button>
                );
              })}
            </div>
            <div className="exam-nav">
              <button type="button" className="btn" disabled={index === 0} onClick={() => go(index - 1)}>
                ← Back
              </button>
              <button type="button" className="btn ghost" onClick={() => go(index + 1)}>
                {index === n - 1 ? 'Review & submit →' : 'Next →'}
              </button>
            </div>
            <QuestionGrid answers={answers} n={n} index={index} onGo={go} />
            <p className="kbd-hint">
              <kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> <kbd>D</kbd> answer · <kbd>←</kbd> <kbd>→</kbd> move ·{' '}
              <button type="button" className="link-btn" onClick={() => go(n)}>
                Review &amp; submit
              </button>
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function QuestionGrid({ answers, n, index, onGo }: { answers: (Letter | null)[]; n: number; index: number; onGo: (i: number) => void }) {
  return (
    <nav className="qgrid" aria-label="Jump to question">
      {Array.from({ length: n }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`${answers[i] ? 'answered' : ''}${i === index ? ' current' : ''}`}
          aria-label={`Question ${i + 1}${answers[i] ? ', answered' : ''}`}
          aria-current={i === index ? 'step' : undefined}
          onClick={() => onGo(i)}
        >
          {i + 1}
        </button>
      ))}
    </nav>
  );
}

function Summary({
  answers,
  n,
  index,
  onGo,
  onSubmit,
}: {
  answers: (Letter | null)[];
  n: number;
  index: number;
  onGo: (i: number) => void;
  onSubmit: () => void;
}) {
  const unanswered = answers.map((a, i) => (a ? null : i)).filter((i): i is number => i !== null);
  return (
    <>
      <h1 className="stem" style={{ marginBottom: 8 }}>
        Review and submit
      </h1>
      <p className="muted">
        You've answered {n - unanswered.length} of {n} questions.
        {unanswered.length > 0 && ' Unanswered questions are marked wrong.'}
      </p>
      {unanswered.length > 0 && (
        <p>
          Unanswered:{' '}
          {unanswered.map((i, k) => (
            <span key={i}>
              {k > 0 && ', '}
              <button type="button" className="link-btn" onClick={() => onGo(i)}>
                {i + 1}
              </button>
            </span>
          ))}
        </p>
      )}
      <QuestionGrid answers={answers} n={n} index={index} onGo={onGo} />
      <div className="exam-nav">
        <button type="button" className="btn" onClick={() => onGo(n - 1)}>
          ← Back to questions
        </button>
        <button type="button" className="btn primary big" onClick={onSubmit}>
          Submit exam
        </button>
      </div>
    </>
  );
}
