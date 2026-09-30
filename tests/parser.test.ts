import { describe, expect, it } from 'vitest';
import { parseExam } from '../src/lib/parser/parseExam.ts';
import { questionIssues } from '../src/lib/parser/issues.ts';
import { joinLines, buildVocab, normalizeChars } from '../src/lib/parser/normalize.ts';
import { SAMPLE_QUESTIONS } from './fixtures/sampleExam.ts';
import { renderExam } from './fixtures/render.ts';

function expectSample(text: string | string[][]) {
  const result = parseExam(text);
  expect(result.warnings).toEqual([]);
  expect(result.questions).toHaveLength(100);
  result.questions.forEach((q, i) => expect(q).toEqual(SAMPLE_QUESTIONS[i]));
  return result;
}

describe('sample exam fixture', () => {
  it('has 100 questions with answers balanced across A-D', () => {
    expect(SAMPLE_QUESTIONS).toHaveLength(100);
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    for (const q of SAMPLE_QUESTIONS) counts[q.answer]++;
    expect(counts).toEqual({ A: 25, B: 25, C: 25, D: 25 });
    for (const q of SAMPLE_QUESTIONS) expect(questionIssues(q)).toEqual([]);
  });
});

describe('parseExam on the sample exam', () => {
  it('parses clean text', () => {
    expectSample(renderExam(SAMPLE_QUESTIONS));
  });

  it('parses wrapped lines with PDF page headers, footers and page numbers', () => {
    expectSample(renderExam(SAMPLE_QUESTIONS, { wrap: 58, pageLines: 37, pageBreak: '\f' }));
  });

  it('parses pasted text where page breaks were lost', () => {
    expectSample(renderExam(SAMPLE_QUESTIONS, { wrap: 64, pageLines: 41, pageBreak: '\n' }));
  });

  it('parses a key with the explanation on the letter line and citation before the code', () => {
    expectSample(renderExam(SAMPLE_QUESTIONS, { wrap: 70, keySameLine: true, citationFirst: true }));
  });

  it('finds the key without a heading when numbering restarts at 1', () => {
    expectSample(renderExam(SAMPLE_QUESTIONS, { keyHeading: null }));
  });

  it('accepts the "EXAM—KEY" heading style', () => {
    expectSample(renderExam(SAMPLE_QUESTIONS, { keyHeading: 'FINANCE CLUSTER EXAM—KEY' }));
  });

  it('splits short options written on one line', () => {
    expectSample(renderExam(SAMPLE_QUESTIONS, { inlineShortOptions: true, wrap: 90 }));
  });

  it('normalises curly quotes and Windows line endings', () => {
    const text = renderExam(SAMPLE_QUESTIONS, { curlyQuotes: true, wrap: 60 }).replace(/\n/g, '\r\n');
    expectSample(text);
  });
});

const HEADER = ['FINANCE CLUSTER EXAM', 'Test 1255'];

describe('parseExam on hand-written messy text', () => {
  it('handles glued numbers, number-only lines, letter-only lines, ligatures and a header mid-question', () => {
    const text = [
      ...HEADER,
      '1.Which of these is a current asset?',
      'A. Equipment',
      'B. Accounts receivable',
      'C. Mortgage payable',
      'D. Retained earnings',
      '2.',
      'A ﬁnancial plan that estimates income',
      'and expenses is a',
      'A.',
      'budget',
      '2',
      'Copyright © 2023 by MBA Research and Curriculum Center®, Columbus, Ohio',
      '\f' + HEADER.join('\n'),
      'B. ledger',
      'C. journal',
      'D. prospectus',
      '3. A loan costs $1,200 per year, which is',
      '1.50 times last year’s cost. By how much did it rise?',
      'A. 50% B. 150% C. $400 D. $600',
      'ANSWER KEY',
      '1. B',
      'Current assets. Receivables are expected to be collected within',
      'a year.',
      'SOURCE: FI:073',
      'SOURCE: Rivera, M. (2024). Principles of finance [pp. 1-2].',
      '2. A. Budgets. A budget is a financial plan.',
      'FI:106',
      '3. C',
      'Cost increase. $1,200 ÷ 1.5 = $800, so the rise is $400.',
      'SOURCE: Practice Press. (2025). Economics',
      'for business [p. 4].',
      'SOURCE: FI:080',
    ].join('\n');
    const r = parseExam(text);
    expect(r.questions).toEqual([
      {
        number: 1,
        stem: 'Which of these is a current asset?',
        options: ['Equipment', 'Accounts receivable', 'Mortgage payable', 'Retained earnings'],
        answer: 'B',
        explanation: 'Current assets. Receivables are expected to be collected within a year.',
        source: 'Rivera, M. (2024). Principles of finance [pp. 1-2].',
        piCode: 'FI:073',
      },
      {
        number: 2,
        stem: 'A financial plan that estimates income and expenses is a',
        options: ['budget', 'ledger', 'journal', 'prospectus'],
        answer: 'A',
        explanation: 'Budgets. A budget is a financial plan.',
        source: '',
        piCode: 'FI:106',
      },
      {
        number: 3,
        stem: "A loan costs $1,200 per year, which is 1.50 times last year's cost. By how much did it rise?",
        options: ['50%', '150%', '$400', '$600'],
        answer: 'C',
        explanation: 'Cost increase. $1,200 ÷ 1.5 = $800, so the rise is $400.',
        source: 'Practice Press. (2025). Economics for business [p. 4].',
        piCode: 'FI:080',
      },
    ]);
    expect(r.warnings).toEqual(['Found 3 questions. DECA exams usually have 100.']);
  });

  it('does not start a question at an out-of-sequence number inside a stem', () => {
    const text = [
      '1. Which rule applies?',
      'A. Rule',
      '3. of the handbook',
      'B. Rule 4',
      'C. Rule 5',
      'D. Rule 6',
      '2. Next?',
      'A. a',
      'B. b',
      'C. c',
      'D. d',
    ].join('\n');
    const r = parseExam(text);
    expect(r.questions.map((q) => q.options[0])).toEqual(['Rule 3. of the handbook', 'a']);
  });

  it('keeps "A.M." and "D.C." in the stem instead of treating them as options', () => {
    const text = ['1. The office opens at 9', 'A.M. in Washington,', 'D.C. on', 'A. Mondays', 'B. Fridays', 'C. Sundays', 'D. holidays'].join('\n');
    const q = parseExam(text).questions[0];
    expect(q.stem).toBe('The office opens at 9 A.M. in Washington, D.C. on');
    expect(q.options).toEqual(['Mondays', 'Fridays', 'Sundays', 'holidays']);
  });

  it('reads options that were run into the stem line', () => {
    const q = parseExam('1. What is 2 + 2? A. 3 B. 4 C. 5 D. 6').questions[0];
    expect(q.stem).toBe('What is 2 + 2?');
    expect(q.options).toEqual(['3', '4', '5', '6']);
  });

  it('reads a compact key table', () => {
    const qs = ['1. a?', 'A. w', 'B. x', 'C. y', 'D. z', '2. b?', 'A. w', 'B. x', 'C. y', 'D. z', '3. c?', 'A. w', 'B. x', 'C. y', 'D. z'];
    const r = parseExam([...qs, 'KEY', '1. C 2. A 3. D'].join('\n'));
    expect(r.questions.map((q) => q.answer)).toEqual(['C', 'A', 'D']);
    expect(r.keyFound).toBe(true);
  });

  it('does not mistake a key-style question ("1. A company…") for the key', () => {
    const r = parseExam(['1. A company has', 'A. x', 'B. y', 'C. z', 'D. w'].join('\n'));
    expect(r.questions[0].stem).toBe('A company has');
  });

  it('reports missing questions, missing key entries and broken options', () => {
    const text = [
      '1. First?',
      'A. a',
      'B. b',
      'C. c',
      'D. d',
      '3. Third?',
      'A. a',
      'B. b',
      'D. d',
      'ANSWER KEY',
      '1. A',
      'Because.',
      'SOURCE: FI:001',
      '5. B',
    ].join('\n');
    const r = parseExam(text);
    expect(r.warnings).toContain('Question numbers not found: 2.');
    expect(r.warnings).toContain("The answer key has entries for questions that weren't found: 5.");
    const third = r.questions[1];
    expect(third.options).toEqual(['a', 'b', '', 'd']);
    expect(third.answer).toBe('');
    const texts = questionIssues(third).map((i) => i.text);
    expect(texts).toContain('Option C is empty.');
    expect(texts).toContain('No correct answer. Pick one.');
    expect(texts).toContain('No explanation.');
  });

  it('reads a partial exam that starts part-way through', () => {
    const text = renderExam(SAMPLE_QUESTIONS.slice(25, 50), { wrap: 70 });
    const r = parseExam(text);
    expect(r.questions.map((q) => q.number)).toEqual(SAMPLE_QUESTIONS.slice(25, 50).map((q) => q.number));
    r.questions.forEach((q, i) => expect(q).toEqual(SAMPLE_QUESTIONS[25 + i]));
    expect(r.warnings).toEqual(['Found 25 questions. DECA exams usually have 100.']);
  });

  it('keeps bare code lines in a pasted key (they repeat like headers but are not)', () => {
    const qs = [1, 2, 3, 4].flatMap((n) => [`${n}. Question ${n}?`, 'A. a', 'B. b', 'C. c', 'D. d']);
    const key = [1, 2, 3, 4].flatMap((n) => [`${n}. B`, `Because ${n}.`, `FI:01${n}`, `SOURCE: Book ${n}.`]);
    const r = parseExam([...qs, 'ANSWER KEY', ...key].join('\n'));
    expect(r.questions.map((q) => q.piCode)).toEqual(['FI:011', 'FI:012', 'FI:013', 'FI:014']);
    expect(r.questions.map((q) => q.source)).toEqual(['Book 1.', 'Book 2.', 'Book 3.', 'Book 4.']);
  });

  it('does not skip a question whose stem starts with "A " after a stray number line', () => {
    const text = [
      '1. First?', 'A. a', 'B. b', 'C. c', 'D. d',
      '2. Second covers', '4. things', 'A. a', 'B. b', 'C. c', 'D. d',
      '3. A company wants to know what?', 'A. a', 'B. b', 'C. c', 'D. d',
      '4. Fourth?', 'A. a', 'B. b', 'C. c', 'D. d',
    ].join('\n');
    const r = parseExam(text);
    expect(r.questions.map((q) => q.number)).toEqual([1, 2, 3, 4]);
    expect(r.questions[1].stem).toBe('Second covers 4. things');
    expect(r.questions[2].stem).toBe('A company wants to know what?');
  });

  it('keeps a number that wrapped onto its own line in pasted text', () => {
    const q = parseExam(['1. How much?', 'A. 100', 'B.', '250', 'C. 300', 'D. 400'].join('\n')).questions[0];
    expect(q.options).toEqual(['100', '250', '300', '400']);
  });

  it('still drops page numbers next to running headers in pasted text', () => {
    const page = (n: number) => [`${n}`, 'Copyright © 2023 Sample', 'FINANCE CLUSTER EXAM', 'Test 1255'];
    const text = ['1. How much?', 'A. 100', ...page(1), 'B. 200', 'C. 300', ...page(2), 'D. 400', ...page(3)].join('\n');
    expect(parseExam(text).questions[0].options).toEqual(['100', '200', '300', '400']);
  });

  it('keeps initials in a stem instead of splitting them into options', () => {
    const text = ['2. Mr. A. Smith and Ms. B. Jones own a firm. What is it?', 'A. a', 'B. b', 'C. c', 'D. d'].join('\n');
    const q = parseExam(text).questions[0];
    expect(q.stem).toBe('Mr. A. Smith and Ms. B. Jones own a firm. What is it?');
    expect(q.options).toEqual(['a', 'b', 'c', 'd']);
  });

  it('flags a missing key', () => {
    const r = parseExam(['1. a?', 'A. w', 'B. x', 'C. y', 'D. z'].join('\n'));
    expect(r.keyFound).toBe(false);
    expect(r.warnings[0]).toMatch(/No answer key/);
  });

  it('flags a suspiciously long option', () => {
    const issues = questionIssues({
      stem: 'Q?',
      options: ['a', 'b', 'c', 'd '.repeat(80)],
      answer: 'A',
      explanation: 'x',
      source: '',
      piCode: 'FI:001',
    });
    expect(issues.some((i) => i.text.startsWith('Option D is much longer'))).toBe(true);
  });

  it('returns a helpful warning for text with no questions', () => {
    expect(parseExam('hello world').warnings[0]).toMatch(/No numbered questions/);
  });
});

describe('normalize helpers', () => {
  it('keeps real hyphenated compounds and removes typesetting hyphens', () => {
    const vocab = buildVocab(['financial planning is financial']);
    expect(joinLines(['long-', 'term'], vocab)).toBe('long-term');
    expect(joinLines(['finan-', 'cial'], vocab)).toBe('financial');
  });

  it('fixes ligatures, odd spaces and soft hyphens', () => {
    expect(normalizeChars('ﬁ ﬂ­ow “q”')).toBe('fi flow "q"');
  });
});
