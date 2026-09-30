/**
 * Render sample questions as DECA-format exam text, optionally with the mess
 * that PDF extraction and copy-paste produce: wrapped lines, running
 * headers/footers, page numbers, curly quotes and a KEY section per page.
 */
import { LETTERS } from '../../src/lib/types.ts';
import { SAMPLE_PREAMBLE, type SampleQuestion } from './sampleExam.ts';

export interface RenderOptions {
  /** Wrap long lines at this many characters (0 = never). */
  wrap?: number;
  /** Insert page furniture after this many body lines (0 = no pages). */
  pageLines?: number;
  /** Page separator: '\f' keeps pages (like PDF extraction), '\n' loses them (like copy-paste). */
  pageBreak?: '\f' | '\n';
  /** Heading before the key; null = no heading (key starts at "1. X"). */
  keyHeading?: string | null;
  /** Put "1. B Current ratio. …" on one line instead of letter then explanation. */
  keySameLine?: boolean;
  /** Put the citation SOURCE line before the code line. */
  citationFirst?: boolean;
  /** Put options of 12 chars or fewer on one line: "A. 2.5 B. 0.4 C. 1.5 D. 3". */
  inlineShortOptions?: boolean;
  curlyQuotes?: boolean;
}

export function wrapText(text: string, width: number): string[] {
  if (!width || text.length <= width) return [text];
  // Break at spaces, or right after a hyphen inside a compound word.
  const pieces = text.split(' ').flatMap((w, i) => {
    const parts = w.split(/(?<=[a-z]-)(?=[a-z])/);
    return parts.map((p, j) => ({ p, space: j === 0 && i > 0 }));
  });
  const lines: string[] = [];
  let cur = '';
  for (const { p, space } of pieces) {
    const add = (cur && space ? ' ' : '') + p;
    if (cur && (cur + add).length > width) {
      lines.push(cur);
      cur = p;
    } else {
      cur += add;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function renderExam(questions: SampleQuestion[], opts: RenderOptions = {}): string {
  const {
    wrap = 0,
    pageLines = 0,
    pageBreak = '\f',
    keyHeading = 'ANSWER KEY',
    keySameLine = false,
    citationFirst = false,
    inlineShortOptions = false,
    curlyQuotes = false,
  } = opts;

  const examBody: string[] = [];
  const out = (s: string) => examBody.push(...wrapText(s, wrap));

  for (const q of questions) {
    out(`${q.number}. ${q.stem}`);
    if (inlineShortOptions && q.options.every((o) => o.length <= 12)) {
      out(q.options.map((o, i) => `${LETTERS[i]}. ${o}`).join(' '));
    } else {
      q.options.forEach((o, i) => out(`${LETTERS[i]}. ${o}`));
    }
    examBody.push('');
  }

  const keyBody: string[] = [];
  const kout = (s: string) => keyBody.push(...wrapText(s, wrap));
  for (const q of questions) {
    if (keySameLine) {
      kout(`${q.number}. ${q.answer} ${q.explanation}`);
    } else {
      kout(`${q.number}. ${q.answer}`);
      kout(q.explanation);
    }
    const code = `SOURCE: ${q.piCode}`;
    const cite = `SOURCE: ${q.source}`;
    for (const s of citationFirst ? [cite, code] : [code, cite]) kout(s);
    keyBody.push('');
  }

  let pageNo = 0;
  const paginate = (lines: string[], header: string[]) => {
    if (!pageLines) return lines.join('\n');
    const pages: string[] = [];
    for (let i = 0; i < lines.length; i += pageLines) {
      pageNo++;
      const footer = [`${pageNo}`, 'Copyright © 2026 Sample Press, Toronto, Ontario'];
      pages.push([...header, ...lines.slice(i, i + pageLines), ...footer].join('\n'));
    }
    return pages.join(pageBreak === '\f' ? '\f' : '\n');
  };

  const examHeader = ['FINANCE CLUSTER EXAM', 'Test 9123'];
  const keyHeader = ['FINANCE CLUSTER EXAM—KEY', 'Test 9123'];
  let text = paginate([...SAMPLE_PREAMBLE, '', ...examBody], examHeader);
  const keyStart = keyHeading === null ? [] : [keyHeading, ''];
  const keyText = pageLines ? paginate([...keyStart, ...keyBody], keyHeader) : [...keyStart, ...keyBody].join('\n');
  text += (pageLines && pageBreak === '\f' ? '\f' : '\n') + keyText;

  if (curlyQuotes) text = text.replace(/'/g, '’');
  return text;
}
