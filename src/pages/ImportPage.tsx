import { memo, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuestionEditor, withFourOptions } from '../components/QuestionEditor.tsx';
import { Segmented } from '../components/ui.tsx';
import { fingerprint } from '../lib/fingerprint.ts';
import { downloadPdf, fileNameFromLink, linksIn } from '../lib/links.ts';
import { questionIssues, type EditableQuestion, type Issue } from '../lib/parser/issues.ts';
import { parseExam } from '../lib/parser/parseExam.ts';
import { findDuplicates, requestPersistentStorage, saveImportedExam, type Duplicate, type ExamMeta } from '../lib/repo.ts';
import { LETTERS, type Cluster, type Letter } from '../lib/types.ts';
import { MetaFields } from './ExamDetailPage.tsx';

interface Item extends EditableQuestion {
  key: number;
  number: number;
}

/** Exams being imported from links, one after another. */
interface LinkQueue {
  /** Links not saved yet; the first is the one being checked. */
  links: string[];
  total: number;
  saved: string[];
  linked: number;
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
  const [dupes, setDupes] = useState<Map<number, Duplicate | null>>(new Map());
  const [replace, setReplace] = useState<Set<number>>(new Set());
  // "Only flagged" freezes the list when chosen, so a question doesn't vanish mid-fix.
  const [flagged, setFlagged] = useState<Set<number> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dupeRequest = useRef(0);
  const fpCache = useRef(new WeakMap<Item, string>());
  const [testNumber, setTestNumber] = useState('');
  const [links, setLinks] = useState('');
  const [linkError, setLinkError] = useState('');
  const [queue, setQueue] = useState<LinkQueue | null>(null);
  const linkCount = linksIn(links).length;

  /** Parse an exam and open the review step. Returns what went wrong, if nothing could be read. */
  const load = (input: string | string[][], fileName?: string): string | null => {
    const result = parseExam(input);
    if (!result.questions.length) return result.warnings[0] ?? 'No questions found.';
    setItems(result.questions.map((q, i) => ({ ...withFourOptions(q), key: i, number: q.number })));
    setWarnings(result.warnings);
    setReplace(new Set());
    setDupes(new Map());
    setFlagged(null);
    // The cover page ("Finance Cluster Exam", "2024-2025 Competitive Events
    // Program", "for State/Province Use") beats guessing from the file name.
    const { testNumber: test, ...info } = result.info;
    setMeta((m) => ({ ...m, ...(fileName ? guessMeta(fileName) : {}), ...info, fileName }));
    setTestNumber(test ?? '');
    setError('');
    setStep('review');
    window.scrollTo({ top: 0 });
    return null;
  };

  const readFile = async (file: File) => {
    setError('');
    setQueue(null);
    try {
      if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
        setBusy(`Reading ${file.name}…`);
        const { pdfToPages } = await import('../lib/parser/pdf.ts');
        setError(load(await pdfToPages(await file.arrayBuffer()), file.name) ?? '');
      } else {
        setError(load(await file.text(), file.name) ?? '');
      }
    } catch (e) {
      setError(`Couldn't read ${file.name}. ${e instanceof Error ? e.message : ''} If it's a scanned PDF (a picture of text), it has no text to read; paste the text instead.`);
    } finally {
      setBusy('');
    }
  };

  /** Download and open the first link in the queue. On failure, go back with the links still to do. */
  const openLink = async (q: LinkQueue) => {
    const link = q.links[0];
    const name = fileNameFromLink(link);
    const n = q.total - q.links.length + 1;
    const which = q.total > 1 ? `exam ${n} of ${q.total}` : 'the exam';
    setQueue(q);
    setLinks(q.links.join('\n'));
    setLinkError('');
    setBusy(`Downloading ${which}…`);
    let problem: string | null;
    try {
      const data = await downloadPdf(link);
      setBusy(`Reading ${which}…`);
      const { pdfToPages } = await import('../lib/parser/pdf.ts');
      problem = load(await pdfToPages(data), name || undefined);
    } catch (e) {
      problem = e instanceof Error ? e.message : String(e);
    } finally {
      setBusy('');
    }
    if (problem) {
      const before = q.saved.length ? ` The ${q.saved.length} before it ${q.saved.length === 1 ? 'was' : 'were'} saved.` : '';
      setLinkError(`Couldn't import ${q.total > 1 ? which : 'that link'} (${name || link}): ${problem}${before}`);
      setQueue(null);
      setStep('input');
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void readFile(file);
  };

  // Which questions are already in the library, keyed by item (re-checked as you edit).
  useEffect(() => {
    if (step !== 'review') return;
    const request = ++dupeRequest.current;
    const t = setTimeout(() => {
      void findDuplicates(items).then((found) => {
        if (request === dupeRequest.current) setDupes(new Map(items.map((q, i) => [q.key, found[i]])));
      });
    }, 300);
    return () => clearTimeout(t);
  }, [items, step]);

  const issues = useMemo(() => new Map(items.map((q) => [q.key, questionIssues(q)])), [items]);

  const sameAsEarlier = useMemo(() => {
    const first = new Map<string, number>();
    const out = new Map<number, number>();
    for (const q of items) {
      let fp = fpCache.current.get(q);
      if (!fp) fpCache.current.set(q, (fp = fingerprint(q.stem, q.options)));
      if (first.has(fp)) out.set(q.key, first.get(fp)!);
      else first.set(fp, q.number);
    }
    return out;
  }, [items]);

  const update = useCallback((key: number, next: EditableQuestion) => setItems((all) => all.map((x) => (x.key === key ? { ...x, ...next } : x))), []);
  const remove = useCallback((key: number) => setItems((all) => all.filter((x) => x.key !== key)), []);
  const toggleReplace = useCallback(
    (key: number, on: boolean) =>
      setReplace((r) => {
        const next = new Set(r);
        if (on) next.add(key);
        else next.delete(key);
        return next;
      }),
    [],
  );

  const autoTitle = `${meta.cluster} ${meta.year || ''} ${meta.level}${testNumber ? ` · Test ${testNumber}` : ''}`.replace(/\s+/g, ' ').trim();
  const isError = (q: Item) => issues.get(q.key)!.some((i) => i.level === 'error');
  const errorCount = items.filter(isError).length;
  const warnCount = items.filter((q) => !isError(q) && issues.get(q.key)!.length > 0).length;
  const dupeCount = items.filter((q) => dupes.get(q.key)).length;
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
      const saved = [...(queue?.saved ?? []), exam.title];
      const linked = (queue?.linked ?? 0) + dupeCount;
      if (queue && queue.links.length > 1) {
        await openLink({ ...queue, links: queue.links.slice(1), saved, linked });
        return;
      }
      setQueue(null);
      setLinks('');
      navigate('/library', { state: { saved: saved.join('”, “'), linked } });
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
          <strong>{(!queue && busy) || 'Drop a PDF here'}</strong>
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
        <div className="or">or import from links</div>
        <label className="field">
          PDF links
          <textarea
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            placeholder={'https://…/Finance_Cluster_Sample_Exam_2017.pdf\nhttps://…/Finance_Cluster_Sample_Exam_2018.pdf'}
            style={{ minHeight: 90, fontSize: 14 }}
          />
          <span className="field-hint">One or more links to exam PDFs, one per line. The app downloads each one, and you check them one after another.</span>
        </label>
        {linkError && (
          <div className="notice bad" style={{ marginTop: 16 }} role="alert">
            {linkError}
          </div>
        )}
        <div className="row" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn primary big"
            disabled={!linkCount || !!busy}
            onClick={() => void openLink({ links: linksIn(links), total: linkCount, saved: [], linked: 0 })}
          >
            {(queue && busy) || (linkCount > 1 ? `Import ${linkCount} exams` : 'Import from link')}
          </button>
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
          <button
            type="button"
            className="btn primary big"
            disabled={!text.trim() || !!busy}
            onClick={() => {
              setQueue(null);
              setError(load(text) ?? '');
            }}
          >
            Read exam
          </button>
        </div>
      </div>
    );
  }

  const visible = flagged ? items.filter((q) => flagged.has(q.key)) : items;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Check the questions</h1>
          <p className="lede">
            {queue && queue.total > 1 && `Exam ${queue.total - queue.links.length + 1} of ${queue.total} from your links. `}
            Fix anything flagged, then save. You can also edit questions later from the Library.
          </p>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setQueue(null);
            setStep('input');
          }}
        >
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
          value={flagged ? 'problems' : 'all'}
          onChange={(v) => setFlagged(v === 'all' ? null : new Set(items.filter((q) => issues.get(q.key)!.length > 0).map((q) => q.key)))}
          options={[
            { value: 'all', label: 'All questions' },
            { value: 'problems', label: `Only flagged (${errorCount + warnCount})` },
          ]}
        />
      </div>

      <div className="stack" style={{ gap: 12 }}>
        {visible.map((q) => (
          <ImportItem
            key={q.key}
            item={q}
            issues={issues.get(q.key)!}
            dupe={dupes.get(q.key) ?? null}
            sameAs={sameAsEarlier.get(q.key) ?? null}
            replacing={replace.has(q.key)}
            onUpdate={update}
            onRemove={remove}
            onReplace={toggleReplace}
          />
        ))}
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
            {busy || (queue && queue.links.length > 1 ? 'Save & next' : 'Save exam')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** One question in the review list; memoised so typing re-renders only the question being edited. */
const ImportItem = memo(function ImportItem({
  item,
  issues,
  dupe,
  sameAs,
  replacing,
  onUpdate,
  onRemove,
  onReplace,
}: {
  item: Item;
  issues: Issue[];
  dupe: Duplicate | null;
  sameAs: number | null;
  replacing: boolean;
  onUpdate: (key: number, q: EditableQuestion) => void;
  onRemove: (key: number) => void;
  onReplace: (key: number, on: boolean) => void;
}) {
  return (
    <QuestionEditor
      number={item.number}
      value={item}
      issues={issues}
      onChange={(next) => onUpdate(item.key, next)}
      onDelete={() => onRemove(item.key)}
      notice={
        dupe ? (
          <DuplicateNotice dupe={dupe} q={item} replacing={replacing} onReplace={(on) => onReplace(item.key, on)} />
        ) : sameAs !== null ? (
          `Same as question ${sameAs} in this exam. It will be stored once.`
        ) : undefined
      }
    />
  );
});

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

