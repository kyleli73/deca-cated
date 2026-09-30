import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QuestionReview } from '../components/QuestionReview.tsx';
import { download, Segmented } from '../components/ui.tsx';
import { areaName } from '../lib/areas.ts';
import { toBlooketCsv } from '../lib/blooket.ts';
import { db } from '../lib/db.ts';
import { MASTERY_DAYS } from '../lib/srs.ts';
import { dayKey, formatDate, formatDay } from '../lib/time.ts';
import type { Question, ReviewCard } from '../lib/types.ts';

type Status = 'learning' | 'learned' | 'all';
type Sort = 'recent' | 'most' | 'area';

export default function MistakesPage() {
  const cards = useLiveQuery(() => db.reviews.toArray());
  const questions = useLiveQuery(async () => {
    const ids = (await db.reviews.toCollection().primaryKeys()) as string[];
    const qs = await db.questions.bulkGet(ids);
    return new Map(qs.filter((q): q is Question => !!q).map((q) => [q.id, q]));
  });
  const [status, setStatus] = useState<Status>('learning');
  const [area, setArea] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [blooketTime, setBlooketTime] = useState(60);

  if (!cards || !questions) return null;

  const items = cards.map((c) => ({ card: c, q: questions.get(c.questionId) })).filter((x): x is { card: ReviewCard; q: Question } => !!x.q);
  const counts = {
    learning: items.filter((x) => !x.card.mastered).length,
    learned: items.filter((x) => x.card.mastered).length,
    all: items.length,
  };
  const areas = [...new Set(items.map((x) => x.q.area))].sort((a, b) => areaName(a).localeCompare(areaName(b)));
  const shown = items
    .filter((x) => status === 'all' || (status === 'learned') === x.card.mastered)
    .filter((x) => !area || x.q.area === area)
    .sort((a, b) =>
      sort === 'most'
        ? b.card.wrongCount - a.card.wrongCount || b.card.lastWrongAt - a.card.lastWrongAt
        : sort === 'area'
          ? areaName(a.q.area).localeCompare(areaName(b.q.area)) || a.q.piCode.localeCompare(b.q.piCode)
          : b.card.lastWrongAt - a.card.lastWrongAt,
    );

  const today = dayKey();
  const exportBlooket = () =>
    download(`deca-wrong-answers-blooket-${today}.csv`, toBlooketCsv(shown.map((x) => x.q), blooketTime), 'text/csv;charset=utf-8');

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Wrong answers</h1>
          <p className="lede">Every question you've missed, with the right answer and why.</p>
        </div>
        <div className="row no-print">
          <button type="button" className="btn" onClick={() => window.print()} disabled={!shown.length}>
            Print or save as PDF
          </button>
        </div>
      </div>
      <p className="print-only muted small">
        Printed {formatDate(Date.now())} · {shown.length} questions
      </p>

      {items.length === 0 ? (
        <div className="empty">
          <h2>No wrong answers yet</h2>
          <p className="muted">When you miss a question in any exam or drill, it's saved here with its explanation.</p>
          <Link to="/" className="btn primary">
            Start studying
          </Link>
        </div>
      ) : (
        <>
          <div className="card no-print" style={{ marginBottom: 24 }}>
            <div className="row" style={{ gap: 16, alignItems: 'flex-end' }}>
              <div className="field">
                <span className="small muted">Show</span>
                <Segmented
                  label="Show"
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: 'learning', label: `Still learning (${counts.learning})` },
                    { value: 'learned', label: `Learned (${counts.learned})` },
                    { value: 'all', label: `All (${counts.all})` },
                  ]}
                />
              </div>
              <label className="field" style={{ minWidth: 200 }}>
                Area
                <select value={area} onChange={(e) => setArea(e.target.value)}>
                  <option value="">All areas</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {areaName(a)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ minWidth: 160 }}>
                Sort
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="recent">Most recent</option>
                  <option value="most">Most missed</option>
                  <option value="area">By area</option>
                </select>
              </label>
            </div>
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '20px 0' }} />
            <div className="row" style={{ alignItems: 'flex-end', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <h3 style={{ marginBottom: 2 }}>Blooket</h3>
                <p className="muted small" style={{ margin: 0 }}>
                  Downloads the {shown.length} questions shown as a CSV for Blooket's “CSV Import” when you create a set. Blooket imports the questions and
                  answers; explanations stay here.
                </p>
              </div>
              <label className="field" style={{ width: 150 }}>
                Seconds per question
                <select value={blooketTime} onChange={(e) => setBlooketTime(Number(e.target.value))}>
                  {[20, 30, 45, 60, 90, 120].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn primary" onClick={exportBlooket} disabled={!shown.length}>
                Download for Blooket (.csv)
              </button>
            </div>
          </div>

          <div className="review-list">
            {shown.map((x, i) => (
              <QuestionReview
                key={x.card.questionId}
                number={i + 1}
                question={x.q}
                chosen={x.card.lastWrongChoice}
                chosenLabel="Your last wrong answer"
                showResult={false}
                footer={<CardProgress card={x.card} today={today} />}
              />
            ))}
            {shown.length === 0 && <p className="muted">Nothing here with these filters.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function CardProgress({ card, today }: { card: ReviewCard; today: string }) {
  return (
    <>
      <span>
        Missed {card.wrongCount}× · last on {formatDate(card.lastWrongAt)}
      </span>
      {card.mastered ? (
        <span className="status-pill good">✓ Learned</span>
      ) : (
        <span>
          Right on {card.box} of {MASTERY_DAYS} days · {card.due <= today ? 'due now' : `next review ${formatDay(card.due)}`}
        </span>
      )}
    </>
  );
}
