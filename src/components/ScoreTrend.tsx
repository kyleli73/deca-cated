import { useRef, useState, type PointerEvent } from 'react';
import type { TrendPoint } from '../lib/stats.ts';
import { formatDate } from '../lib/time.ts';

const W = 720;
const H = 240;
const PAD = { top: 16, right: 44, bottom: 30, left: 40 };
const TICKS = [0, 25, 50, 75, 100];

/**
 * Score % per full exam, oldest to newest. A single series: 2px accent line,
 * end marker with a surface ring, the latest value labelled directly,
 * crosshair + tooltip on hover/focus, and a table view.
 */
export function ScoreTrend({ points }: { points: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!points.length) return <p className="muted">Finish a full 100-question exam to start your trend.</p>;

  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (pct: number) => PAD.top + ih - (pct / 100) * ih;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ');
  const last = points.length - 1;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    setHover(best);
  };

  const h = hover === null ? null : points[hover];
  return (
    <div>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8 }}>
        <button type="button" className="link-btn small" onClick={() => setTable(!table)}>
          {table ? 'Show chart' : 'Show as table'}
        </button>
      </div>
      {table ? (
        <table className="data">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Exam</th>
              <th className="n">Score</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={p.sessionId}>
                <td className="num">{i + 1}</td>
                <td>{formatDate(p.at)}</td>
                <td>{p.title}</td>
                <td className="n">{Math.round(p.pct)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="chart-wrap">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Score trend over ${points.length} exams. Latest ${Math.round(points[last].pct)}%.`}
            tabIndex={0}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(last)}
            onBlur={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setHover((v) => Math.max(0, (v ?? last) - 1));
              if (e.key === 'ArrowRight') setHover((v) => Math.min(last, (v ?? 0) + 1));
            }}
          >
            {TICKS.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" className="num">
                  {t}%
                </text>
              </g>
            ))}
            {[0, last].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">
                {formatDate(points[i].at)}
              </text>
            ))}
            {h && <line x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--line-strong)" strokeWidth={1} />}
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.length <= 40 &&
              points.map((p, i) =>
                i === last ? null : <circle key={p.sessionId} cx={x(i)} cy={y(p.pct)} r={3} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />,
              )}
            <circle cx={x(last)} cy={y(points[last].pct)} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
            <text x={x(last) + 10} y={y(points[last].pct)} dy="0.32em" fontSize={13} fontWeight={600} fill="var(--ink)">
              {Math.round(points[last].pct)}%
            </text>
            {h && <circle cx={x(hover!)} cy={y(h.pct)} r={5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />}
          </svg>
          {h && (
            <div className="chart-tooltip" style={{ left: `${(x(hover!) / W) * 100}%`, top: `${(y(h.pct) / H) * 100}%` }}>
              <strong>{Math.round(h.pct)}%</strong>
              <span className="key" />
              {h.title} · {formatDate(h.at)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
