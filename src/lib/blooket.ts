import { LETTERS, type BlooketSet, type Question } from './types.ts';

/** Where sets are created. Blooket has no way for another app to create a set or open one question, so the link goes to the home page. */
export const BLOOKET_HOME = 'https://www.blooket.com/';

/**
 * A pasted Blooket set link, tidied up, or null unless it's an https page on
 * blooket.com (so a lookalike such as blooket.com.example.net is refused).
 * The "https://" may be left off.
 */
export function blooketLink(pasted: string): string | null {
  const text = pasted.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  return host === 'blooket.com' || host.endsWith('.blooket.com') ? url.href : null;
}

/** For each question, the newest set it's in that has a Blooket link. */
export function linkedSets(sets: BlooketSet[]): Map<string, BlooketSet> {
  const out = new Map<string, BlooketSet>();
  for (const set of [...sets].sort((a, b) => b.createdAt - a.createdAt)) {
    if (!set.url) continue;
    for (const id of set.questionIds) if (!out.has(id)) out.set(id, set);
  }
  return out;
}

/** Header rows of Blooket's "Spreadsheet Import Template" (CSV Import on the set creator page). */
const TITLE_ROW = ['Blooket\nImport Template', '', '', '', '', '', '', ''];
const HEADER_ROW = [
  'Question #',
  'Question Text',
  'Answer 1',
  'Answer 2',
  'Answer 3\n(Optional)',
  'Answer 4\n(Optional)',
  'Time Limit (sec)\n(Max: 300 seconds)',
  'Correct Answer(s)\n(Only include Answer #)',
];

function cell(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toBlooketCsv(questions: Pick<Question, 'stem' | 'options' | 'answer'>[], timeLimitSec = 60): string {
  const time = Math.min(300, Math.max(5, Math.round(timeLimitSec)));
  const rows = [
    TITLE_ROW,
    HEADER_ROW,
    ...questions.map((q, i) => [
      String(i + 1),
      q.stem,
      q.options[0] ?? '',
      q.options[1] ?? '',
      q.options[2] ?? '',
      q.options[3] ?? '',
      String(time),
      String(LETTERS.indexOf(q.answer) + 1),
    ]),
  ];
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
