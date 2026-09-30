/**
 * Lay out the sample exam as a real PDF with the same structure as DECA's
 * exam booklets: a cover page, a running header ("Test 9123  FINANCE CLUSTER
 * EXAM  1") with the page number on the same baseline, option letters at one
 * tab stop and option text at another, a copyright footer whose ® is a
 * superscript (pdf.js reads it as its own line), a "KEY" cover page, and key
 * entries whose "SOURCE: FI:093 <performance indicator>" line wraps.
 */
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { LETTERS } from '../../src/lib/types.ts';
import type { SampleQuestion } from './sampleExam.ts';

const SIZE = 10.5;
const LEADING = 14;
const LEFT = 72;
const RIGHT = 540;
const TOP = 720;
const BOTTOM = 80;

const COVER = [
  'Competency-Based',
  'Competitive Events',
  '*Written Exam*',
  'for State/Province Use',
  'Test Number 9123',
  'Booklet Number _____',
  'Finance Cluster Exam',
  'INSTRUCTIONS: This is a timed, comprehensive practice exam. Do not open this booklet until instructed to do so.',
  'This sample was prepared for the 2025-2026 Competitive Events Program format. It was written to test the deca-cated',
  'importer, is not an official DECA or MBA Research exam, and cites fictional textbooks. A descriptive test key has',
  'been provided to the chartered association advisor.',
];

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
  let page!: PDFPage;
  let y = 0;
  let pageNo = 0;
  let header = 'FINANCE CLUSTER EXAM';

  const footer = () => {
    page.drawText('Copyright © 2026 by Sample Press, Toronto, Ontario', { x: 190, y: 36, size: 8, font });
    page.drawText('®', { x: 338, y: 42, size: 5, font }); // superscript: its own line to pdf.js
  };
  const newPage = () => {
    page = doc.addPage([612, 792]);
    pageNo++;
    page.drawText('Test 9123', { x: LEFT, y: 750, size: 9, font });
    page.drawText(header, { x: 230, y: 750, size: 9, font: bold });
    page.drawText(String(pageNo), { x: 530, y: 750, size: 9, font });
    footer();
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
  const cover = (first?: string) => {
    page = doc.addPage([612, 792]);
    y = TOP;
    if (first) block('', LEFT, first, LEFT, bold);
    for (const line of COVER) block('', LEFT, line, LEFT);
    footer();
  };

  cover();
  newPage();
  for (const q of questions) {
    ensure(6);
    block(`${q.number}.`, LEFT, q.stem, LEFT + 20);
    q.options.forEach((o, i) => block(`${LETTERS[i]}.`, LEFT + 20, o, LEFT + 38));
  }

  cover('KEY');
  header = 'FINANCE CLUSTER EXAM—KEY';
  pageNo = 0;
  newPage();
  for (const q of questions) {
    ensure(5);
    block('', LEFT, `${q.number}. ${q.answer}`, LEFT, bold);
    block('', LEFT, q.explanation, LEFT);
    block('', LEFT, `SOURCE: ${q.piCode}${q.piTitle ? ` ${q.piTitle}` : ''}`, LEFT);
    block('', LEFT, `SOURCE: ${q.source}`, LEFT);
  }
  return doc.save();
}
