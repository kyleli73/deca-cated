import type { ReactNode } from 'react';
import { isTouch } from '../lib/hosted.ts';

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

/**
 * Save a file. On a phone this opens the share sheet (Save to Files, Google
 * Drive, AirDrop…), since a plain download is hard to find there. Resolves
 * false if the share sheet was closed without saving.
 */
export async function download(fileName: string, content: string, type: string): Promise<boolean> {
  const file = new File([content], fileName, { type });
  if (isTouch() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false;
      // Not allowed (e.g. the tap was too long ago): download it instead.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function pct(n: number | null | undefined): string {
  return n === null || n === undefined ? '–' : `${Math.round(n)}%`;
}
