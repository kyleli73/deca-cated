import { LETTERS, type Question } from './types.ts';

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
