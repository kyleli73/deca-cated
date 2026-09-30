/**
 * Check how the importer reads an exam PDF, without opening the app:
 *
 *   npm run check-pdf -- path/to/exam.pdf
 *
 * Prints what the cover page says, the number of questions and answers, and
 * every warning the review screen would show.
 */
import { readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { itemsToLines, type TextItemLike } from '../src/lib/parser/pdfLines.ts';
import { parseExam } from '../src/lib/parser/parseExam.ts';
import { questionIssues } from '../src/lib/parser/issues.ts';

const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run check-pdf -- path/to/exam.pdf');
  process.exit(1);
}
const task = getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 });
const doc = await task.promise;
const pages: string[][] = [];
for (let p = 1; p <= doc.numPages; p++) {
  const items: TextItemLike[] = (await (await doc.getPage(p)).getTextContent()).items.filter((it) => 'str' in it);
  pages.push(itemsToLines(items));
}
await task.destroy();

const r = parseExam(pages);
console.log(`${file}: ${doc.numPages} pages`);
console.log('Cover page:', r.info);
console.log(`Questions: ${r.questions.length} · with answers: ${r.questions.filter((q) => q.answer).length} · with codes: ${r.questions.filter((q) => q.piCode).length}`);
for (const w of r.warnings) console.log('Exam warning:', w);
let flagged = 0;
for (const q of r.questions) {
  const issues = questionIssues(q);
  if (issues.length) {
    flagged++;
    console.log(`  ${q.number}. ${issues.map((i) => `${i.level === 'error' ? '●' : '○'} ${i.text}`).join('  ')}`);
  }
  const leak = [q.stem, ...q.options, q.explanation].find((t) => /Copyright ©|®|CLUSTER EXAM/.test(t));
  if (leak) console.log(`  ${q.number}. possible page header/footer text: ${leak.slice(0, 80)}`);
}
console.log(flagged ? `${flagged} questions flagged.` : 'No questions flagged.');
