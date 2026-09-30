/**
 * The calculator's maths: a small, safe expression evaluator (no eval).
 *
 * Supports + − × ÷, brackets, powers (^), square roots (√), percent and the
 * previous answer (Ans), with normal order of operations. Percent works like
 * a phone calculator: 200 + 10% = 220, 200 × 10% = 20, 10% alone = 0.1.
 * Missing closing brackets are added automatically.
 */

export class CalcError extends Error {}

type Token = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'ans' };

const OPS = '+-*/^%()√';

/** Display symbols → the ASCII the evaluator uses. */
export function toAscii(s: string): string {
  return s.replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/,/g, '');
}

/** ASCII → display symbols. */
export function toDisplay(s: string): string {
  return s.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');
}

function tokenize(src: string): Token[] {
  const s = toAscii(src).replace(/\s+/g, '');
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/[\d.]/.test(ch)) {
      const m = /^[\d.]+(e[+-]?\d+)?/i.exec(s.slice(i))![0];
      if (m === '.' || (m.match(/\./g)?.length ?? 0) > 1) throw new CalcError('Check the decimal point.');
      out.push({ t: 'num', v: Number(m) });
      i += m.length;
    } else if (s.startsWith('Ans', i)) {
      out.push({ t: 'ans' });
      i += 3;
    } else if (OPS.includes(ch)) {
      out.push({ t: 'op', v: ch });
      i++;
    } else {
      throw new CalcError(`Can't use "${ch}".`);
    }
  }
  return out;
}

type Node = { k: 'n'; v: number } | { k: 'pct'; v: Node } | { k: 'bin'; op: string; a: Node; b: Node } | { k: 'neg'; v: Node } | { k: 'sqrt'; v: Node };

function parse(tokens: Token[], ans: number): Node {
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.t === 'op' && (peek() as { v: string }).v === v;
  const startsOperand = () => {
    const t = peek();
    return !!t && (t.t === 'num' || t.t === 'ans' || (t.t === 'op' && (t.v === '(' || t.v === '√')));
  };

  function expr(): Node {
    let a = term();
    while (isOp('+') || isOp('-')) {
      const op = (tokens[pos++] as { v: string }).v;
      a = { k: 'bin', op, a, b: term() };
    }
    return a;
  }
  function term(): Node {
    let a = factor();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = (tokens[pos++] as { v: string }).v;
        a = { k: 'bin', op, a, b: factor() };
      } else if (startsOperand()) {
        a = { k: 'bin', op: '*', a, b: factor() }; // 2(3+4), 5√9
      } else {
        return a;
      }
    }
  }
  // A leading minus applies after the power (−3^2 = −9), and exponents can be negative (2^−1).
  function factor(): Node {
    if (isOp('-')) {
      pos++;
      return { k: 'neg', v: factor() };
    }
    if (isOp('+')) {
      pos++;
      return factor();
    }
    const base = postfix();
    if (isOp('^')) {
      pos++;
      return { k: 'bin', op: '^', a: base, b: factor() }; // right-associative
    }
    return base;
  }
  function postfix(): Node {
    let n = primary();
    while (isOp('%')) {
      pos++;
      n = { k: 'pct', v: n };
    }
    return n;
  }
  function primary(): Node {
    const t = tokens[pos++];
    if (!t) throw new CalcError('Finish the expression.');
    if (t.t === 'num') return { k: 'n', v: t.v };
    if (t.t === 'ans') return { k: 'n', v: ans };
    if (t.v === '√') return { k: 'sqrt', v: factor() };
    if (t.v === '(') {
      const inner = expr();
      if (isOp(')')) pos++; // a missing ")" at the end is fine
      else if (pos < tokens.length) throw new CalcError('Check the brackets.');
      return inner;
    }
    throw new CalcError('Finish the expression.');
  }

  const tree = expr();
  if (pos < tokens.length) throw new CalcError(isOp(')') ? 'Check the brackets.' : 'Finish the expression.');
  return tree;
}

function value(n: Node): number {
  switch (n.k) {
    case 'n':
      return n.v;
    case 'pct':
      return value(n.v) / 100;
    case 'neg':
      return -value(n.v);
    case 'sqrt': {
      const v = value(n.v);
      if (v < 0) throw new CalcError("Can't take the square root of a negative number.");
      return Math.sqrt(v);
    }
    case 'bin': {
      const a = value(n.a);
      // Percent of what came before: 200 + 10% = 220, 200 − 10% = 180.
      if ((n.op === '+' || n.op === '-') && n.b.k === 'pct') {
        const part = (a * value(n.b.v)) / 100;
        return n.op === '+' ? a + part : a - part;
      }
      const b = value(n.b);
      switch (n.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          if (b === 0) throw new CalcError("Can't divide by 0.");
          return a / b;
        default:
          return a ** b;
      }
    }
  }
}

/** Evaluate an expression typed with display or ASCII symbols. */
export function evaluate(expression: string, ans = 0): number {
  const tokens = tokenize(expression);
  if (!tokens.length) throw new CalcError('Type a calculation.');
  const result = value(parse(tokens, ans));
  if (!Number.isFinite(result)) throw new CalcError('That number is too big.');
  return Number(result.toPrecision(12)); // hide float noise: 0.1 + 0.2 = 0.3
}

/** The result as you type, or null while the expression is incomplete. */
export function preview(expression: string, ans = 0): number | null {
  try {
    return evaluate(expression, ans);
  } catch {
    return null;
  }
}

export function formatNumber(n: number): string {
  if (n !== 0 && (Math.abs(n) >= 1e15 || Math.abs(n) < 1e-9)) return n.toExponential(6).replace(/\.?0+e/, 'e');
  return n.toLocaleString('en-US', { maximumFractionDigits: 10 });
}

/** A result as something that can be typed back into an expression. */
export function numberToInput(n: number): string {
  return String(n).replace('e+', 'e');
}

const OPERATORS = '+-*/^';

/**
 * Apply one key to the expression, like a calculator would: a second operator
 * replaces the first (except "−" for negatives), and "." isn't doubled.
 */
export function press(expression: string, key: string): string {
  const last = expression.slice(-1);
  if (OPERATORS.includes(key)) {
    if (!expression) return key === '-' ? '-' : `Ans${key}`;
    if (OPERATORS.includes(last)) {
      if (key === '-' && last !== '-' && last !== '+') return expression + key; // 5×−2
      const trimmed = expression.replace(/[+\-*/^]+$/, '');
      return trimmed ? trimmed + key : key === '-' ? '-' : '';
    }
    if (last === '(' && key !== '-') return expression;
    return expression + key;
  }
  if (key === '.') {
    const currentNumber = /[\d.]*$/.exec(expression)![0];
    if (currentNumber.includes('.')) return expression;
    return expression + (currentNumber ? '.' : '0.');
  }
  return expression + key;
}
