import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QuestionEditor } from '../components/QuestionEditor.tsx';
import { db } from '../lib/db.ts';
import { hasErrors, type EditableQuestion } from '../lib/parser/issues.ts';
import { updateExamMeta, updateQuestion, type ExamMeta } from '../lib/repo.ts';
import { CLUSTERS, LEVELS, type Cluster, type Level, type Question } from '../lib/types.ts';

export default function ExamDetailPage() {
  const { id = '' } = useParams();
  const exam = useLiveQuery(() => db.exams.get(id), [id]);
  const questions = useLiveQuery(async () => (exam ? db.questions.bulkGet(exam.questionIds) : undefined), [exam]);
  const [meta, setMeta] = useState<ExamMeta | null>(null);
  const [savedMeta, setSavedMeta] = useState(false);

  useEffect(() => {
    if (exam && !meta) setMeta({ title: exam.title, cluster: exam.cluster, year: exam.year, level: exam.level });
  }, [exam, meta]);

  if (exam === undefined || !questions || !meta) {
    return exam === undefined ? null : (
      <>
        <h1>Exam not found</h1>
        <Link to="/library">Back to Library</Link>
      </>
    );
  }

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div>
        <Link to="/library" className="small">
          ← Library
        </Link>
        <h1 style={{ marginTop: 8 }}>{exam.title}</h1>
        <p className="lede" style={{ marginBottom: 0 }}>
          {exam.questionIds.length} questions. Edits apply everywhere the question appears.
        </p>
      </div>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          void updateExamMeta(exam.id, meta).then(() => setSavedMeta(true));
        }}
      >
        <h2 style={{ marginBottom: 16 }}>Details</h2>
        <MetaFields meta={meta} onChange={(m) => (setMeta(m), setSavedMeta(false))} />
        <div className="row" style={{ marginTop: 16 }}>
          <button type="submit" className="btn primary">
            Save details
          </button>
          {savedMeta && <span className="muted small">Saved.</span>}
        </div>
      </form>

      <section className="stack" style={{ gap: 12 }}>
        <h2>Questions</h2>
        {questions.map((q, i) => (q ? <StoredQuestion key={q.id} number={i + 1} question={q} /> : null))}
      </section>
    </div>
  );
}

const EDITABLE = ['stem', 'options', 'answer', 'explanation', 'source', 'piCode'] as const;

function StoredQuestion({ number, question }: { number: number; question: Question }) {
  const [draft, setDraft] = useState<EditableQuestion>(question);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const dirty = EDITABLE.some((k) => JSON.stringify(draft[k]) !== JSON.stringify(question[k]));

  return (
    <div>
      <QuestionEditor
        number={number}
        value={draft}
        onChange={(q) => {
          setDraft(q);
          setSaved(false);
          setError('');
        }}
      />
      {dirty && (
        <div className="row" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn small primary"
            disabled={hasErrors(draft)}
            onClick={() =>
              updateQuestion(question.id, draft)
                .then(() => setSaved(true))
                .catch((e: Error) => setError(e.message))
            }
          >
            Save question {number}
          </button>
          <button type="button" className="btn small ghost" onClick={() => setDraft(question)}>
            Undo changes
          </button>
          {error && <span className="small" style={{ color: 'var(--bad)' }}>{error}</span>}
        </div>
      )}
      {saved && !dirty && <p className="muted small" style={{ marginTop: 6 }}>Saved.</p>}
    </div>
  );
}

export function MetaFields({ meta, onChange }: { meta: ExamMeta; onChange: (m: ExamMeta) => void }) {
  return (
    <div className="fields">
      <label className="field" style={{ gridColumn: '1 / -1' }}>
        Title
        <input type="text" value={meta.title} onChange={(e) => onChange({ ...meta, title: e.target.value })} />
      </label>
      <label className="field">
        Cluster
        <select value={meta.cluster} onChange={(e) => onChange({ ...meta, cluster: e.target.value as Cluster })}>
          {CLUSTERS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Year
        <input
          type="number"
          min={2000}
          max={2100}
          value={meta.year || ''}
          placeholder="2024"
          onChange={(e) => onChange({ ...meta, year: Number(e.target.value) })}
        />
        <span className="field-hint">Spring year: 2023–24 is 2024</span>
      </label>
      <label className="field">
        Level
        <select value={meta.level} onChange={(e) => onChange({ ...meta, level: e.target.value as Level })}>
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
