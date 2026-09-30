/**
 * Lay out the sample exam as a real PDF, the way DECA exams look: running
 * header with the test number, option letters at one tab stop and option text
 * at another, wrapped text, page numbers and a copyright footer.
 */
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { LETTERS } from '../../src/lib/types.ts';
import { SAMPLE_PREAMBLE, type SampleQuestion } from './sampleExam.ts';

const SIZE = 10.5;
const LEADING = 14;
const LEFT = 72;
const RIGHT = 540;
const TOP = 720;
const BOTTOM = 80;

function wrap(font: PDFFont, text: string, width: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.split(' ')) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && font.widthOfTextAtSize(next, SIZE) > width) {
      lines.push(cur);
      cur = word;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function renderPdf(questions: SampleQuestion[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage;
  let y = 0;
  let pageNo = 0;
  let header = 'FINANCE CLUSTER EXAM';

  const newPage = () => {
    page = doc.addPage([612, 792]);
    pageNo++;
    page.drawText(header, { x: LEFT, y: 750, size: 9, font: bold });
    page.drawText('Test 9123', { x: 490, y: 750, size: 9, font });
    page.drawText(String(pageNo), { x: 303, y: 42, size: 9, font });
    page.drawText('Copyright © 2026 Sample Press, Toronto, Ontario', { x: 190, y: 30, size: 8, font });
    y = TOP;
  };
  const ensure = (lines: number) => {
    if (y - lines * LEADING < BOTTOM) newPage();
  };
  /** Draw `label` at x1 and wrapped `text` at x2, like a hanging indent. */
  const block = (label: string, x1: number, text: string, x2: number, f = font) => {
    const lines = wrap(f, text, RIGHT - x2);
    ensure(Math.min(lines.length, 2));
    if (label) page.drawText(label, { x: x1, y, size: SIZE, font: f });
    for (const line of lines) {
      ensure(1);
      page.drawText(line, { x: x2, y, size: SIZE, font: f });
      y -= LEADING;
    }
  };

  newPage();
  for (const line of SAMPLE_PREAMBLE) block('', LEFT, line, LEFT);
  y -= LEADING;
  for (const q of questions) {
    ensure(6);
    block(`${q.number}.`, LEFT, q.stem, LEFT + 20);
    q.options.forEach((o, i) => block(`${LETTERS[i]}.`, LEFT + 20, o, LEFT + 38));
    y -= LEADING / 2;
  }

  header = 'FINANCE CLUSTER EXAM—KEY';
  newPage();
  for (const q of questions) {
    ensure(5);
    block('', LEFT, `${q.number}. ${q.answer}`, LEFT, bold);
    block('', LEFT, q.explanation, LEFT);
    block('', LEFT, `SOURCE: ${q.piCode}`, LEFT);
    block('', LEFT, `SOURCE: ${q.source}`, LEFT);
    y -= LEADING / 2;
  }
  return doc.save();
}
