import type { AreaStat } from '../lib/stats.ts';

/**
 * What you know per instructional area, weakest first. Two stacked segments:
 * right without guessing (solid) and right by guessing (lighter). The gap to
 * the end of the track is what you got wrong. The headline % is what you
 * actually knew; the raw score is beside it.
 */
export function AreaBars({ areas }: { areas: AreaStat[] }) {
  if (!areas.length) return <p className="muted">Answer some questions to see this.</p>;
  return (
    <div>
      <div className="bar-legend" aria-hidden="true">
        <span>
          <i className="swatch known" /> Knew it
        </span>
        <span>
          <i className="swatch lucky" /> Guessed right
        </span>
      </div>
      <div className="bars" role="table" aria-label="What you know by instructional area">
        {areas.map((a) => (
          <div
            className="bar-row"
            role="row"
            key={a.area || 'none'}
            title={`${a.name}: knew ${a.known}, guessed right ${a.lucky}, wrong ${a.total - a.correct} (of ${a.total})`}
          >
            <div className="name" role="cell">
              {a.name}
              {a.area && a.area !== a.name && <span className="code">{a.area}</span>}
            </div>
            <div className="bar-track" role="presentation">
              {a.known > 0 && <div className="bar-fill" style={{ width: `${a.knownPct}%` }} />}
              {a.lucky > 0 && <div className="bar-fill lucky" style={{ width: `${(a.lucky / a.total) * 100}%` }} />}
            </div>
            <div
              className="val"
              role="cell"
              aria-label={`Knew ${Math.round(a.knownPct)}%, ${a.correct} of ${a.total} right${a.lucky ? `, ${a.lucky} by guessing` : ''}`}
            >
              {Math.round(a.knownPct)}%
              <span>
                {a.correct}/{a.total} right
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
