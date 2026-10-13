import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BLOOKET_HOME, blooketLink, toBlooketCsv } from '../lib/blooket.ts';
import { db } from '../lib/db.ts';
import { deleteBlooketSet, saveBlooketSet, setBlooketLink } from '../lib/repo.ts';
import { dayKey, formatDate, formatDay } from '../lib/time.ts';
import type { BlooketSet, Question } from '../lib/types.ts';
import { download } from './ui.tsx';

/**
 * Download questions for Blooket's CSV Import, and keep a list of the sets
 * made that way. Blooket has no way for another app to create a set or open
 * a question, so once the set exists on Blooket its link is pasted back here,
 * and every question in it gets an "Open in Blooket" link.
 */
export function BlooketPanel({ questions }: { questions: Question[] }) {
  const sets = useLiveQuery(() => db.blooketSets.orderBy('createdAt').reverse().toArray());
  const today = dayKey();
  const [name, setName] = useState(`Wrong answers ${formatDay(today)}`);
  const [seconds, setSeconds] = useState(60);
  const [made, setMade] = useState<{ name: string; fileName: string } | null>(null);

  const exportCsv = async () => {
    const fileName = `deca-wrong-answers-blooket-${today}.csv`;
    if (!(await download(fileName, toBlooketCsv(questions, seconds), 'text/csv;charset=utf-8'))) return;
    const set = await saveBlooketSet(name, questions.map((q) => q.id));
    setMade({ name: set.name, fileName });
  };

  return (
    <div>
      <h3 style={{ marginBottom: 2 }}>Blooket</h3>
      <p className="muted small" style={{ margin: 0 }}>
        Downloads the {questions.length} questions shown as a CSV for Blooket's “CSV Import” when you create a set. Blooket imports the questions and answers;
        explanations stay here.
      </p>
      <div className="row" style={{ alignItems: 'flex-end', gap: 16, marginTop: 12 }}>
        <label className="field" style={{ flex: 1, minWidth: 200 }}>
          Set name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field" style={{ width: 150 }}>
          Seconds per question
          <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>
            {[20, 30, 45, 60, 90, 120].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn primary" onClick={() => void exportCsv()} disabled={!questions.length}>
          Download for Blooket (.csv)
        </button>
      </div>

      {made && (
        <div className="notice" role="status" style={{ marginTop: 16 }}>
          <strong>Next, on Blooket</strong>
          <ol>
            <li>
              Open{' '}
              <a href={BLOOKET_HOME} target="_blank" rel="noreferrer">
                blooket.com
              </a>
              , create a set called “{made.name}” and choose <strong>CSV Import</strong>.
            </li>
            <li>
              Upload <strong>{made.fileName}</strong>.
            </li>
            <li>Open the finished set, copy its link from the address bar, and paste it below. Each of its questions then gets an “Open in Blooket” link here.</li>
          </ol>
        </div>
      )}

      {sets && sets.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Your Blooket sets</h3>
          <ul className="blooket-sets">
            {sets.map((s) => (
              <SetRow key={s.id} set={s} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SetRow({ set }: { set: BlooketSet }) {
  const [editing, setEditing] = useState(!set.url);
  const [draft, setDraft] = useState(set.url ?? '');
  const [error, setError] = useState('');

  const save = () => {
    const url = blooketLink(draft);
    if (!url) {
      setError("That isn't a Blooket link. Open the set on blooket.com and copy the address from the address bar.");
      return;
    }
    setError('');
    setEditing(false);
    void setBlooketLink(set.id, url);
  };

  return (
    <li>
      <div className="row" style={{ gap: 8 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <strong>{set.name}</strong>
          <div className="muted small">
            {set.questionIds.length} question{set.questionIds.length === 1 ? '' : 's'} · downloaded {formatDate(set.createdAt)}
          </div>
        </div>
        {set.url && !editing && (
          <>
            <a className="btn small" href={set.url} target="_blank" rel="noreferrer">
              Open in Blooket ↗
            </a>
            <button
              type="button"
              className="btn small ghost"
              onClick={() => {
                setDraft(set.url ?? '');
                setEditing(true);
              }}
            >
              Change link
            </button>
          </>
        )}
        <button
          type="button"
          className="btn small ghost danger"
          onClick={() => {
            if (confirm(`Remove “${set.name}” from this list? The set stays on Blooket.`)) void deleteBlooketSet(set.id);
          }}
        >
          Remove
        </button>
      </div>
      {editing && (
        <form
          className="row"
          style={{ gap: 8, marginTop: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <input
            type="text"
            inputMode="url"
            aria-label={`Blooket link for ${set.name}`}
            placeholder="Paste the set's link from Blooket"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <button type="submit" className="btn small primary">
            Save link
          </button>
          {set.url && (
            <button type="button" className="btn small ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          )}
        </form>
      )}
      {error && (
        <p className="small" role="alert" style={{ color: 'var(--bad)', margin: '6px 0 0' }}>
          {error}
        </p>
      )}
    </li>
  );
}
