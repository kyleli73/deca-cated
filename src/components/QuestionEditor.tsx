import { useState, type ReactNode } from 'react';
import { questionIssues, type EditableQuestion } from '../lib/parser/issues.ts';
import { LETTERS } from '../lib/types.ts';

/** Pad or trim to exactly four options so every letter has an input. */
export function withFourOptions<T extends EditableQuestion>(q: T): T {
  const options = [...q.options.slice(0, 4)];
  while (options.length < 4) options.push('');
  // Keep any text past option D rather than silently dropping it.
  if (q.options.length > 4) options[3] = [options[3], ...q.options.slice(4)].join(' ');
  return { ...q, options };
}

export function QuestionEditor({
  number,
  value,
  onChange,
  onDelete,
  notice,
  startOpen,
}: {
  number: number;
  value: EditableQuestion;
  onChange: (q: EditableQuestion) => void;
  onDelete?: () => void;
  notice?: ReactNode;
  startOpen?: boolean;
}) {
  const issues = questionIssues(value);
  const hasError = issues.some((i) => i.level === 'error');
  const [open, setOpen] = useState(startOpen ?? issues.length > 0);
  const set = (patch: Partial<EditableQuestion>) => onChange({ ...value, ...patch });
  const cls = `qedit${hasError ? ' has-error' : issues.length ? ' has-warning' : ''}`;

  if (!open) {
    return (
      <div className={cls}>
        <button type="button" className="qedit-compact" onClick={() => setOpen(true)} aria-label={`Edit question ${number}`}>
          <span className="qedit-num">{number}.</span>
          <span className="stem-preview">{value.stem || <em>No question text</em>}</span>
          <span className="tag">Answer {value.answer || '?'}</span>
          {notice && <span className="tag">In library</span>}
          <span className="link-btn small">Edit</span>
        </button>
      </div>
    );
  }

  return (
    <div className={cls} data-testid={`qedit-${number}`}>
      <div className="qedit-head">
        <span className="qedit-num">{number}.</span>
        <div className="spacer" />
        {onDelete && (
          <button type="button" className="btn ghost small danger" onClick={onDelete}>
            Delete question
          </button>
        )}
        {startOpen === undefined && (
          <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>
            Collapse
          </button>
        )}
      </div>
      {issues.length > 0 && (
        <ul className="issues">
          {issues.map((i) => (
            <li key={i.text} className={i.level}>
              {i.level === 'error' ? '● ' : '○ '}
              {i.text}
            </li>
          ))}
        </ul>
      )}
      {notice && <div className="notice small" style={{ marginBottom: 14 }}>{notice}</div>}
      <div className="stack" style={{ gap: 14 }}>
        <label className="field">
          Question
          <textarea value={value.stem} rows={2} onChange={(e) => set({ stem: e.target.value })} />
        </label>
        <div className="field" role="group" aria-label="Options">
          <span>
            Options <span className="field-hint">· select the correct answer</span>
          </span>
          {value.options.map((o, i) => (
            <div className="opt-edit" key={i}>
              <span className="l">{LETTERS[i]}</span>
              <input
                type="radio"
                name={`answer-${number}`}
                aria-label={`${LETTERS[i]} is correct`}
                checked={value.answer === LETTERS[i]}
                onChange={() => set({ answer: LETTERS[i] })}
              />
              <input
                type="text"
                aria-label={`Option ${LETTERS[i]}`}
                value={o}
                onChange={(e) => set({ options: value.options.map((x, j) => (j === i ? e.target.value : x)) })}
              />
            </div>
          ))}
        </div>
        <label className="field">
          Explanation
          <textarea value={value.explanation} rows={2} onChange={(e) => set({ explanation: e.target.value })} />
        </label>
        <div className="fields">
          <label className="field">
            Source
            <input type="text" value={value.source} onChange={(e) => set({ source: e.target.value })} />
          </label>
          <label className="field">
            Code
            <input type="text" value={value.piCode} placeholder="FI:093" onChange={(e) => set({ piCode: e.target.value })} />
          </label>
        </div>
      </div>
    </div>
  );
}
