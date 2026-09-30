import type { AreaStat } from '../lib/stats.ts';

/** Accuracy per instructional area as horizontal bars, weakest first. One series, one colour. */
export function AreaBars({ areas }: { areas: AreaStat[] }) {
  if (!areas.length) return <p className="muted">Answer some questions to see this.</p>;
  return (
    <div className="bars" role="table" aria-label="Accuracy by instructional area">
      {areas.map((a) => (
        <div className="bar-row" role="row" key={a.area || 'none'} title={`${a.name}: ${a.correct} of ${a.total} correct`}>
          <div className="name" role="cell">
            {a.name}
            {a.area && a.area !== a.name && <span className="code">{a.area}</span>}
          </div>
          <div className="bar-track" role="presentation">
            <div className="bar-fill" style={{ width: `${a.pct}%` }} />
          </div>
          <div className="val" role="cell">
            {Math.round(a.pct)}%<span>{a.correct}/{a.total}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
