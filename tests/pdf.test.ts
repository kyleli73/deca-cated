import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { itemsToLines, type TextItemLike } from '../src/lib/parser/pdfLines.ts';
import { parseExam } from '../src/lib/parser/parseExam.ts';
import { SAMPLE_QUESTIONS } from './fixtures/sampleExam.ts';
import { renderPdf } from './fixtures/pdf.ts';

async function extract(bytes: Uint8Array): Promise<string[][]> {
  const task = getDocument({ data: bytes, verbosity: 0 });
  const doc = await task.promise;
  const pages: string[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    const items: TextItemLike[] = content.items.filter((it) => 'str' in it);
    pages.push(itemsToLines(items));
  }
  await task.destroy();
  return pages;
}

describe('PDF import through pdf.js', () => {
  it('rebuilds lines from positioned text items', () => {
    const item = (str: string, x: number, y: number, width: number) => ({ str, transform: [10, 0, 0, 10, x, y], width, height: 10 });
    expect(
      itemsToLines([item('Option text', 108, 700, 50), item('A.', 90, 700.4, 8), item('12.', 72, 720, 12), item('Stem', 90, 720, 20)]),
    ).toEqual(['12. Stem', 'A. Option text']);
  });

  it('parses the generated sample exam PDF exactly', async () => {
    const pages = await extract(await renderPdf(SAMPLE_QUESTIONS));
    expect(pages.length).toBeGreaterThan(10);
    const result = parseExam(pages);
    expect(pages[0]).toContain('for State/Province Use');
    expect(pages.flat()).toContain('\u00AE'); // the superscript really is its own line
    expect(result.info).toEqual({ cluster: 'Finance', year: 2026, level: 'Association', testNumber: '9123' });
    expect(result.warnings).toEqual([]);
    expect(result.questions).toHaveLength(100);
    result.questions.forEach((q, i) => expect(q).toEqual(SAMPLE_QUESTIONS[i]));
  });
});
