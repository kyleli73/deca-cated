import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from 'react';
import { evaluate, formatNumber, numberToInput, press, preview, toDisplay, CalcError } from '../lib/calc.ts';

// ------------------------------------------------------------------- state
// One calculator for the whole app, so it keeps its numbers while you move
// between questions and pages. Saved in this browser as a convenience.

interface CalcState {
  open: boolean;
  expr: string;
  ans: number;
  /** The last key was "=": typing a number starts a new calculation. */
  done: boolean;
  error: string;
  history: { expr: string; result: number }[];
}

const STORAGE_KEY = 'deca-cated:calculator';
const HISTORY_MAX = 8;

function load(): CalcState {
  const empty: CalcState = { open: false, expr: '', ans: 0, done: false, error: '', history: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<CalcState> | null;
    return saved ? { ...empty, ...saved, error: '' } : empty;
  } catch {
    return empty;
  }
}

let state = load();
const listeners = new Set<() => void>();

function set(patch: Partial<CalcState>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, error: '' }));
  } catch {
    // Private window or storage blocked: the calculator still works, it just won't remember.
  }
  listeners.forEach((l) => l());
}

function useCalc(): CalcState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function toggleCalculator(open = !state.open) {
  set({ open });
}

const OPERATORS = new Set(['+', '-', '*', '/', '^']);

function key(k: string) {
  // After "=", a number starts fresh; an operator carries on from the answer.
  const base = state.done && !OPERATORS.has(k) && k !== '%' ? '' : state.expr;
  set({ expr: press(base, k), done: false, error: '' });
}

function equals() {
  if (state.done || !state.expr) return;
  try {
    const result = evaluate(state.expr, state.ans);
    set({
      ans: result,
      expr: numberToInput(result),
      done: true,
      error: '',
      history: [{ expr: state.expr, result }, ...state.history].slice(0, HISTORY_MAX),
    });
  } catch (e) {
    set({ error: e instanceof CalcError ? e.message : 'Something went wrong.' });
  }
}

function backspace() {
  if (state.done) return set({ expr: '', done: false, error: '' });
  set({ expr: state.expr.endsWith('Ans') ? state.expr.slice(0, -3) : state.expr.slice(0, -1), error: '' });
}

function clear() {
  set({ expr: '', done: false, error: '' });
}

/** Put a past result into the calculation: after an operator or "(", or as a fresh start. */
function insertResult(n: number) {
  const text = numberToInput(n);
  const continues = !state.done && /[+\-*/^(]$/.test(state.expr);
  set({ expr: continues ? state.expr + text : text, done: false, error: '' });
}

// -------------------------------------------------------------------- keys

interface Key {
  label: string;
  aria?: string;
  kind: 'num' | 'op' | 'fn' | 'eq' | 'clear';
  run: () => void;
}

const KEYS: Key[] = [
  { label: '%', aria: 'percent', kind: 'fn', run: () => key('%') },
  { label: 'xʸ', aria: 'power', kind: 'fn', run: () => key('^') },
  { label: '√', aria: 'square root', kind: 'fn', run: () => key('√') },
  { label: 'Ans', aria: 'previous answer', kind: 'fn', run: () => key('Ans') },
  { label: 'AC', aria: 'clear', kind: 'clear', run: clear },
  { label: '(', kind: 'fn', run: () => key('(') },
  { label: ')', kind: 'fn', run: () => key(')') },
  { label: '÷', aria: 'divide', kind: 'op', run: () => key('/') },
  ...['7', '8', '9'].map((d) => ({ label: d, kind: 'num' as const, run: () => key(d) })),
  { label: '×', aria: 'times', kind: 'op', run: () => key('*') },
  ...['4', '5', '6'].map((d) => ({ label: d, kind: 'num' as const, run: () => key(d) })),
  { label: '−', aria: 'minus', kind: 'op', run: () => key('-') },
  ...['1', '2', '3'].map((d) => ({ label: d, kind: 'num' as const, run: () => key(d) })),
  { label: '+', aria: 'plus', kind: 'op', run: () => key('+') },
  { label: '0', kind: 'num', run: () => key('0') },
  { label: '.', aria: 'decimal point', kind: 'num', run: () => key('.') },
  { label: '⌫', aria: 'backspace', kind: 'fn', run: backspace },
  { label: '=', aria: 'equals', kind: 'eq', run: equals },
];

const TYPED: Record<string, string> = { x: '*', X: '*', '×': '*', '÷': '/' };

// ---------------------------------------------------------------------- UI

function CalcIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="1.5" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="4.5" y="3.5" width="7" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="5.5" cy="9" r="0.8" fill="currentColor" />
      <circle cx="8" cy="9" r="0.8" fill="currentColor" />
      <circle cx="10.5" cy="9" r="0.8" fill="currentColor" />
      <circle cx="5.5" cy="11.8" r="0.8" fill="currentColor" />
      <circle cx="8" cy="11.8" r="0.8" fill="currentColor" />
      <circle cx="10.5" cy="11.8" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function CalculatorToggle() {
  const { open } = useCalc();
  return (
    <button
      type="button"
      className={`btn ghost small calc-toggle${open ? ' on' : ''}`}
      aria-pressed={open}
      aria-controls="calculator"
      title={open ? 'Hide calculator' : 'Show calculator'}
      onClick={() => toggleCalculator()}
    >
      <CalcIcon />
      <span className="calc-toggle-label">Calculator</span>
    </button>
  );
}

export function CalculatorPanel() {
  const s = useCalc();
  const root = useRef<HTMLElement>(null);

  // Typing goes to the calculator as soon as it opens.
  useEffect(() => {
    if (s.open) root.current?.focus({ preventScroll: true });
  }, [s.open]);

  // Lets the page make room for the panel.
  useEffect(() => {
    document.body.classList.toggle('calc-open', s.open);
    return () => document.body.classList.remove('calc-open');
  }, [s.open]);

  if (!s.open) return null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = TYPED[e.key] ?? e.key;
    let handled = true;
    if (/^[\d.+\-*/^()%]$/.test(k)) key(k);
    else if (k === 'Enter' || k === '=') equals();
    else if (k === 'Backspace') backspace();
    else if (k === 'Delete') clear();
    else if (k === 'Escape') {
      toggleCalculator(false);
      document.querySelector<HTMLElement>('.calc-toggle')?.focus();
    } else handled = false;
    // Keys used here never reach the exam's answer shortcuts.
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const live = s.done || s.error ? null : preview(s.expr, s.ans);
  const shownExpr = s.done && s.history[0] ? `${toDisplay(s.history[0].expr)} =` : toDisplay(s.expr);
  const shownResult = s.error || (s.done ? formatNumber(s.ans) : live !== null ? formatNumber(live) : '');

  return (
    <aside id="calculator" className="calculator" aria-label="Calculator" tabIndex={-1} ref={root} onKeyDown={onKeyDown}>
      <div className="calc-head">
        <span>Calculator</span>
        <button type="button" className="btn ghost small" aria-label="Close calculator" onClick={() => toggleCalculator(false)}>
          ✕
        </button>
      </div>
      <div className="calc-screen">
        <div className="calc-expr" data-testid="calc-expr">
          {shownExpr || ' '}
        </div>
        <div className={`calc-result${s.error ? ' error' : s.done ? '' : ' preview'}`} data-testid="calc-result" aria-live="polite">
          {shownResult || '0'}
        </div>
      </div>
      <div className="calc-keys">
        {KEYS.map((k) => (
          <button key={k.label} type="button" className={`calc-key ${k.kind}`} aria-label={k.aria ?? k.label} onClick={k.run}>
            {k.label}
          </button>
        ))}
      </div>
      {s.history.length > 0 && (
        <div className="calc-history">
          <div className="calc-history-head">
            <span>History</span>
            <button type="button" className="link-btn small" onClick={() => set({ history: [] })}>
              Clear
            </button>
          </div>
          {s.history.map((h, i) => (
            <button key={i} type="button" className="calc-history-item" title="Use this result" onClick={() => insertResult(h.result)}>
              <span className="calc-history-expr">{toDisplay(h.expr)} =</span>
              <span className="calc-history-result">{formatNumber(h.result)}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
