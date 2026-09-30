import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuestionEditor, withFourOptions } from '../components/QuestionEditor.tsx';
import { Segmented } from '../components/ui.tsx';
import { fingerprint } from '../lib/fingerprint.ts';
import { hasErrors, questionIssues, type EditableQuestion } from '../lib/parser/issues.ts';
import { parseExam } from '../lib/parser/parseExam.ts';
import { findDuplicates, requestPersistentStorage, saveImportedExam, type Duplicate, type ExamMeta } from '../lib/repo.ts';
import { LETTERS, type Cluster, type Letter } from '../lib/types.ts';
import { MetaFields } from './ExamDetailPage.tsx';

interface Item extends EditableQuestion {
  key: number;
  number: number;
}

/** Guess cluster, year and level from a file name like "2024 Finance District.pdf". */
export function guessMeta(name: string): Partial<ExamMeta> {
  const n = name.toLowerCase();
  const out: Partial<ExamMeta> = {};
  const years = [...n.matchAll(/20\d\d/g)].map((m) => Number(m[0]));
  if (years.length) out.year = Math.max(...years);
  if (/icdc|international/.test(n)) out.level = 'ICDC';
  else if (/association|provincial|state|\bprov\b/.test(n)) out.level = 'Association';
  else if (/district|regional/.test(n)) out.level = 'District';
  const cluster: [RegExp, Cluster][] = [
    [/personal financ|pfl/, 'Personal Financial Literacy'],
    [/hospitality|tourism/, 'Hospitality & Tourism'],
    [/entrepreneur/, 'Entrepreneurship'],
    [/management|bma|bman/, 'Business Management & Admin'],
    [/admin.*core|principles|core/, 'Business Admin Core'],
    [/marketing/, 'Marketing'],
    [/financ/, 'Finance'],
  ];
  for (const [re, c] of cluster) {
    if (re.test(n)) {
      out.cluster = c;
      break;
    }
  }
  return out;
}

export default function ImportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [text, setText] = useState('');
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<ExamMeta>({ title: '', cluster: 'Finance', year: 0, level: 'District' });
  const [items, setItems] = useState<Item[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dupes, setDupes] = useState<(Duplicate | null)[]>([]);
  const [replace, setReplace] = useState<Set<number>>(new Set());
  const [onlyProblems, setOnlyProblems] = useState<'all' | 'problems'>('all');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = (input: string | string[][], fileName?: string) => {
    const result = parseExam(input);
    if (!result.questions.length) {
      setError(result.warnings[0] ?? 'No questions found.');
      return;
    }
    setItems(result.questions.map((q, i) => ({ ...withFourOptions(q), key: i, number: q.number })));
    setWarnings(result.warnings);
    setReplace(new Set());
    setMeta((m) => ({ ...m, ...(fileName ? guessMeta(fileName) : {}), fileName }));
    setError('');
    setStep('review');
    window.scrollTo({ top: 0 });
  };

  const readFile = async (file: File) => {
    setError('');
    try {
      if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
        setBusy(`Reading ${file.name}…`);
        const { pdfToPages } = await import('../lib/parser/pdf.ts');
        load(await pdfToPages(await file.arrayBuffer()), file.name);
      } else {
        load(await file.text(), file.name);
      }
    } catch (e) {
      setError(`Couldn't read ${file.name}. ${e instanceof Error ? e.message : ''} If it's a scanned PDF (a picture of text), it has no text to read; paste the text instead.`);
    } finally {
      setBusy('');
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void readFile(file);
  };

  // Which questions are already in the library (re-checked as you edit).
  useEffect(() => {
    if (step !== 'review') return;
    const t = setTimeout(() => void findDuplicates(items).then(setDupes), 300);
    return () => clearTimeout(t);
  }, [items, step]);

  const inExamDupes = useMemo(() => {
    const first = new Map<string, number>();
    return items.map((q) => {
      const fp = fingerprint(q.stem, q.options);
      if (first.has(fp)) return first.get(fp)!;
      first.set(fp, q.number);
      return null;
    });
  }, [items]);

  const autoTitle = `${meta.cluster} ${meta.year || ''} ${meta.level}`.replace(/\s+/g, ' ').trim();
  const errorCount = items.filter(hasErrors).length;
  const warnCount = items.filter((q) => !hasErrors(q) && questionIssues(q).length > 0).length;
  const dupeCount = dupes.filter(Boolean).length;
  const yearOk = meta.year >= 2000 && meta.year <= 2100;

  const save = async () => {
    setBusy('Saving…');
    try {
      const exam = await saveImportedExam(
        { ...meta, title: meta.title.trim() || autoTitle },
        items,
        items.map((q) => replace.has(q.key)),
      );
      void requestPersistentStorage();
      navigate('/library', { state: { saved: exam.title, linked: dupeCount } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy('');
    }
  };

  if (step === 'input') {
    return (
      <div>
        <h1>Import an exam</h1>
        <p className="lede">
          Add a past DECA exam: 100 numbered questions with options A–D, then the answer key with explanations, sources and codes like FI:093. You'll check
          every question before it's saved.
        </p>
        <div
          className={`dropzone${over ? ' over' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => fileInput.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <strong>{busy || 'Drop a PDF here'}</strong>
          <span className="muted small">or click to choose a file (.pdf or .txt)</span>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            hidden
            data-testid="file-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void readFile(f);
              e.target.value = '';
            }}
          />
        </div>
        <div className="or">or paste the text</div>
        <label className="field">
          Exam text
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'1. Which of the following…\nA. …\nB. …\nC. …\nD. …\n\nANSWER KEY\n1. B\nExplanation…\nSOURCE: FI:093\nSOURCE: …'}
            style={{ minHeight: 220, fontSize: 14 }}
          />
        </label>
        {error && (
          <div className="notice bad" style={{ marginTop: 16 }} role="alert">
            {error}
          </div>
        )}
        <div className="row" style={{ marginTop: 16 }}>
          <button type="button" className="btn primary big" disabled={!text.trim() || !!busy} onClick={() => load(text)}>
            Read exam
          </button>
        </div>
      </div>
    );
  }

  const visible = items.filter((q) => onlyProblems === 'all' || questionIssues(q).length > 0);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Check the questions</h1>
          <p className="lede">Fix anything flagged, then save. You can also edit questions later from the Library.</p>
        </div>
        <button type="button" className="btn ghost" onClick={() => setStep('input')}>
          ← Start over
        </button>
      </div>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 16 }}>Tag this exam</h2>
        <MetaFields meta={meta} onChange={setMeta} />
        {!meta.title && <p className="field-hint" style={{ marginTop: 8 }}>Title will be “{autoTitle}” unless you type one.</p>}
      </section>

      <div className="summary-chips" style={{ marginBottom: 16 }}>
        <span className="tag">{items.length} questions</span>
        {errorCount > 0 && (
          <span className="tag" style={{ color: 'var(--bad)' }}>
            {errorCount} need fixing
          </span>
        )}
        {warnCount > 0 && (
          <span className="tag" style={{ color: 'var(--warn)' }}>
            {warnCount} with warnings
          </span>
        )}
        {dupeCount > 0 && <span className="tag">{dupeCount} already in your library</span>}
      </div>

      {warnings.length > 0 && (
        <div className="notice warn" style={{ marginBottom: 20 }}>
          <strong>About this exam</strong>
          <ul>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="row" style={{ marginBottom: 16 }}>
        <Segmented
          label="Show"
          value={onlyProblems}
          onChange={setOnlyProblems}
          options={[
            { value: 'all', label: 'All questions' },
            { value: 'problems', label: `Only flagged (${errorCount + warnCount})` },
          ]}
        />
      </div>

      <div className="stack" style={{ gap: 12 }}>
        {visible.map((q) => {
          const idx = items.indexOf(q);
          const dupe = dupes[idx];
          const sameAs = inExamDupes[idx];
          return (
            <QuestionEditor
              key={q.key}
              number={q.number}
              value={q}
              onChange={(next) => setItems((all) => all.map((x) => (x.key === q.key ? { ...x, ...next } : x)))}
              onDelete={() => setItems((all) => all.filter((x) => x.key !== q.key))}
              notice={
                dupe ? (
                  <DuplicateNotice
                    dupe={dupe}
                    q={q}
                    replacing={replace.has(q.key)}
                    onReplace={(on) =>
                      setReplace((r) => {
                        const next = new Set(r);
                        if (on) next.add(q.key);
                        else next.delete(q.key);
                        return next;
                      })
                    }
                  />
                ) : sameAs !== null ? (
                  `Same as question ${sameAs} in this exam. It will be stored once.`
                ) : undefined
              }
            />
          );
        })}
        {visible.length === 0 && <p className="muted">No flagged questions.</p>}
      </div>

      <div className="sticky-actions">
        {error && (
          <div className="notice bad" style={{ marginBottom: 12 }} role="alert">
            {error}
          </div>
        )}
        <div className="row">
          <span className="muted small" style={{ flex: 1, minWidth: 200 }}>
            {!yearOk
              ? 'Enter the exam year to save.'
              : errorCount > 0
                ? `Fix or delete ${errorCount} question${errorCount === 1 ? '' : 's'} with red issues to save.`
                : `${items.length} questions ready.`}
          </span>
          <button type="button" className="btn primary big" disabled={!!busy || errorCount > 0 || !yearOk || !items.length} onClick={() => void save()}>
            {busy || 'Save exam'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DuplicateNotice({ dupe, q, replacing, onReplace }: { dupe: Duplicate; q: EditableQuestion; replacing: boolean; onReplace: (on: boolean) => void }) {
  const from = dupe.examTitles.length ? ` (from ${dupe.examTitles.join(', ')})` : '';
  const stored = dupe.existing;
  const storedIdx = LETTERS.indexOf(stored.answer);
  return (
    <div>
      Already in your library{from}. It will be linked to this exam, not copied.
      {dupe.answerDiffers && (
        <div style={{ color: 'var(--warn)', marginTop: 6 }}>
          The stored copy's answer is {stored.answer}: “{stored.options[storedIdx]}”. This exam says {q.answer || '?'}
          {q.answer ? `: “${q.options[LETTERS.indexOf(q.answer as Letter)]}”` : ''}.
        </div>
      )}
      <label className="check small" style={{ marginTop: 6 }}>
        <input type="checkbox" checked={replacing} onChange={(e) => onReplace(e.target.checked)} />
        Replace the stored copy with this version
      </label>
    </div>
  );
}

