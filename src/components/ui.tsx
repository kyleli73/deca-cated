import type { ReactNode } from 'react';

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label,
  format = String,
}: {
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  label: string;
  format?: (v: T) => string;
}) {
  if (!options.length) return <p className="muted small">None yet.</p>;
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={String(o)}
            type="button"
            className="chip"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
          >
            {format(o)}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Minutes input where blank or 0 means "no time limit". */
export function MinutesField({ value, onChange }: { value: number | ''; onChange: (v: number | '') => void }) {
  return (
    <label className="field">
      Time limit (minutes)
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
      />
      <span className="field-hint">{value === '' || value === 0 ? 'No limit: the clock counts up.' : 'Submits automatically at 0:00.'}</span>
    </label>
  );
}

export function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function download(fileName: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pct(n: number | null | undefined): string {
  return n === null || n === undefined ? '–' : `${Math.round(n)}%`;
}
