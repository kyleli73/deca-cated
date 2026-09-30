import { LETTERS } from '../types.ts';

export interface EditableQuestion {
  stem: string;
  options: string[];
  answer: string;
  explanation: string;
  source: string;
  piCode: string;
}

export interface Issue {
  /** Errors block saving; warnings are worth a look but are optional. */
  level: 'error' | 'warning';
  text: string;
}

const LONG_OPTION = 220;

export function questionIssues(q: EditableQuestion): Issue[] {
  const issues: Issue[] = [];
  const err = (text: string) => issues.push({ level: 'error', text });
  const warn = (text: string) => issues.push({ level: 'warning', text });

  if (!q.stem.trim()) err('Question text is empty.');
  if (q.options.length !== 4) err(`Found ${q.options.length} options (expected 4).`);
  q.options.forEach((o, i) => {
    if (!o.trim()) err(`Option ${LETTERS[i] ?? i + 1} is empty.`);
  });
  const answerIdx = LETTERS.indexOf(q.answer as (typeof LETTERS)[number]);
  if (answerIdx < 0) err('No correct answer. Pick one.');
  else if (answerIdx >= q.options.length) err(`The key says ${q.answer}, but there is no option ${q.answer}.`);

  if (!q.explanation.trim()) warn('No explanation.');
  if (!q.piCode.trim()) warn('No instructional-area code (like FI:093).');
  else if (!/^[A-Z]{2,3}:\d{3}$/.test(q.piCode.trim())) warn(`"${q.piCode}" doesn't look like a code such as FI:093.`);

  const lengths = q.options.map((o) => o.length);
  q.options.forEach((o, i) => {
    const others = lengths.filter((_, j) => j !== i);
    const longestOther = Math.max(0, ...others);
    if (o.length > LONG_OPTION || (o.length > 120 && o.length > 3 * longestOther)) {
      warn(`Option ${LETTERS[i]} is much longer than usual. It may include extra text, like a page header.`);
    }
  });
  if (q.stem.length > 700) warn('Question text is unusually long. It may include extra text.');
  return issues;
}

export function hasErrors(q: EditableQuestion): boolean {
  return questionIssues(q).some((i) => i.level === 'error');
}
