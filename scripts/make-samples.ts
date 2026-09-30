/**
 * Write the practice exam used by the tests to samples/, as a PDF and as
 * messy pasted text, so you can try the importer by hand.
 *
 *   npm run samples
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { SAMPLE_QUESTIONS } from '../tests/fixtures/sampleExam.ts';
import { renderExam } from '../tests/fixtures/render.ts';
import { renderPdf } from '../tests/fixtures/pdf.ts';

mkdirSync('samples', { recursive: true });
writeFileSync('samples/finance-sample-exam.pdf', await renderPdf(SAMPLE_QUESTIONS));
writeFileSync(
  'samples/finance-sample-exam-pasted.txt',
  renderExam(SAMPLE_QUESTIONS, { wrap: 72, pageLines: 44, pageBreak: '\n', keyHeading: 'FINANCE CLUSTER EXAM—KEY', curlyQuotes: true }),
);
console.log('Wrote samples/finance-sample-exam.pdf and samples/finance-sample-exam-pasted.txt');
