import { LETTERS, type Cluster, type Letter, type Level } from '../types.ts';
import { buildVocab, cleanLine, joinLines } from './normalize.ts';
import { markNoise, type Line } from './noise.ts';

export interface ParsedQuestion {
  number: number;
  stem: string;
  options: string[];
  answer: Letter | '';
  explanation: string;
  source: string;
  piCode: string;
  /** Performance indicator text after the code, e.g. "Explain types of financial markets". */
  piTitle: string;
}

/** What the cover page says about the exam, used to pre-fill its tags. */
export interface ExamInfo {
  cluster?: Cluster;
  year?: number;
  level?: Level;
  testNumber?: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  /** Problems with the exam as a whole (missing numbers, no key, …). */
  warnings: string[];
  keyFound: boolean;
  info: ExamInfo;
}

const Q_START = /^(\d{1,3})\s*[.)]\s*(.*)$/;
const OPT_START = /^\(?([A-D])\s*[.)]\s*(.*)$/;
const KEY_ENTRY = /^(\d{1,3})\s*[.)]?\s*(?:answer\s*[:.-]?\s*)?([A-D])(?=$|[\s.):–—-])[.):–—-]?\s*(.*)$/i;
const COMPACT_KEY = /^(?:\d{1,3}\s*[.)]\s*[A-D][.)]?(?:\s+|$)){2,}$/;
const SOURCE_LINE = /^SOURCE\s*:\s*(.*)$/i;
const CODE_AT_START = /^\(?([A-Z]{2,3})\s?:\s?(\d{3})\b\)?/;
const CODE_ANYWHERE = /\b([A-Z]{2,3}):(\d{3})\b/;

/**
 * "12. C", "12. C Explanation…", "12. Answer: C". Not "12. A company…": a
 * question whose stem starts with the article "A".
 */
function keyEntry(text: string): { n: number; letter: Letter; rest: string } | null {
  const k = KEY_ENTRY.exec(text);
  if (!k || !/^[A-D]$/.test(k[2]) || /^[a-z]/.test(k[3])) return null;
  return { n: Number(k[1]), letter: k[2] as Letter, rest: k[3] };
}

export function isKeyHeading(text: string): boolean {
  const s = text.trim();
  if (s.length > 80) return false;
  return (
    /^(answer\s*key|answers|key)\s*:?$/i.test(s) ||
    /^answer\s*key\b/i.test(s) ||
    /\b(exam|test)\s*[-–—:]*\s*(answer\s*)?key\b/i.test(s)
  );
}

function toPages(input: string | string[][]): string[][] {
  if (typeof input !== 'string') return input;
  return input.split('\f').map((page) => page.split(/\r\n?|\n/));
}

function toLines(pages: string[][]): Line[] {
  const out: Line[] = [];
  pages.forEach((page, p) => {
    const texts = page.map(cleanLine).filter(Boolean);
    texts.forEach((text, pos) => out.push({ text, page: p, pos, pageLen: texts.length }));
  });
  return out;
}

// ---------------------------------------------------------------- questions

interface Draft {
  number: number;
  stem: string[];
  options: string[][];
}

/** Split "10% B. 20% C. 30%" into ["10%", "20%", "30%"], starting after letter `startIdx`. */
function splitInline(text: string, startIdx: number): string[] {
  const parts = [text];
  for (let idx = startIdx + 1; idx < LETTERS.length; idx++) {
    const last = parts[parts.length - 1];
    const m = new RegExp(`\\s\\(?${LETTERS[idx]}[.)]\\s+`).exec(last);
    if (!m) break;
    parts[parts.length - 1] = last.slice(0, m.index).trim();
    parts.push(last.slice(m.index + m[0].length).trim());
  }
  return parts;
}

function addOptions(d: Draft, letterIdx: number, text: string) {
  while (d.options.length < letterIdx) d.options.push([]);
  for (const part of splitInline(text, letterIdx)) d.options.push(part ? [part] : []);
}

function isOptionStart(d: Draft, text: string): { idx: number; rest: string } | null {
  const m = OPT_START.exec(text);
  if (!m || /^[A-Z]\./.test(m[2])) return null; // "A.M.", "D.C."
  const idx = LETTERS.indexOf(m[1] as Letter);
  const n = d.options.length;
  if (idx === n || (n > 0 && idx > n)) return { idx, rest: m[2] };
  return null;
}

function questionNumber(text: string): number | null {
  const q = Q_START.exec(text);
  return q && !/^\d/.test(q[2]) ? Number(q[1]) : null;
}

/**
 * Numbering skipped ahead (e.g. 12 → 14). Accept only if question 13 doesn't
 * turn up shortly after, and this line is followed by an "A." option, so a
 * stray "14. " at the start of a wrapped line isn't taken for a question.
 */
function isRealJump(lines: string[], i: number, expected: number): boolean {
  for (let j = i + 1; j < Math.min(lines.length, i + 60); j++) {
    if (questionNumber(lines[j]) === expected && !keyEntry(lines[j])) return false;
  }
  return hasOptionsAhead(lines, i);
}

function hasOptionsAhead(lines: string[], i: number): boolean {
  if (/\sA[.)]\s.*\sB[.)]\s/.test(lines[i])) return true;
  for (let j = i + 1; j < Math.min(lines.length, i + 15); j++) {
    if (/^\(?A\s*[.)]/.test(lines[j])) return true;
    if (questionNumber(lines[j]) !== null) return false;
  }
  return false;
}

function parseQuestions(lines: string[], findKey: boolean): { drafts: Draft[]; keyFrom: number | null } {
  const drafts: Draft[] = [];
  let cur: Draft | null = null;
  let expected = 1;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const q = Q_START.exec(text);
    if (q && !/^\d/.test(q[2])) {
      const n = Number(q[1]);
      // No key heading: the key starts where numbering restarts.
      if (findKey && drafts.length >= 5 && n === drafts[0].number && keyEntry(text)) return { drafts, keyFrom: i };
      const accept =
        n === expected ||
        (n > expected && n <= expected + 5 && isRealJump(lines, i, expected)) ||
        // A partial exam that starts at, say, question 26.
        (drafts.length === 0 && n > expected && hasOptionsAhead(lines, i));
      if (accept) {
        cur = { number: n, stem: [], options: [] };
        drafts.push(cur);
        expected = n + 1;
        if (q[2]) appendStem(cur, q[2]);
        continue;
      }
    }
    if (!cur) continue; // cover page / instructions

    const opt = isOptionStart(cur, text);
    if (opt) {
      addOptions(cur, opt.idx, opt.rest);
    } else if (cur.options.length) {
      cur.options[cur.options.length - 1].push(text);
    } else {
      appendStem(cur, text);
    }
  }
  return { drafts, keyFrom: null };
}

/**
 * Stem text; also catches all four options run into the stem ("…is? A. x B. y
 * C. z D. w"). All four are required so initials like "Mr. A. Smith and Ms.
 * B. Jones" stay in the stem.
 */
const INLINE_OPTIONS = /(?:^|\s)\(?A[.)]\s+\S.*?\s\(?B[.)]\s+\S.*?\s\(?C[.)]\s+\S.*?\s\(?D[.)]\s+\S/;
function appendStem(d: Draft, text: string) {
  const m = INLINE_OPTIONS.exec(text);
  if (m) {
    const a = /(?:^|\s)\(?A[.)]\s+/.exec(text.slice(m.index))!;
    const at = m.index + a.index;
    const before = text.slice(0, at).trim();
    if (before) d.stem.push(before);
    addOptions(d, 0, text.slice(at + a[0].length).trim());
    return;
  }
  d.stem.push(text);
}

// ---------------------------------------------------------------------- key

interface KeyDraft {
  number: number;
  letter: Letter;
  explanation: string[];
  sources: string[][];
  code: string;
  indicator: string[];
  /** Which part a wrapped continuation line belongs to. */
  in: 'explanation' | 'indicator' | 'source';
}

function parseKey(lines: string[]): { entries: Map<number, KeyDraft>; duplicates: number[] } {
  const entries = new Map<number, KeyDraft>();
  const duplicates: number[] = [];
  let cur: KeyDraft | null = null;
  let last = 0;

  const start = (n: number, letter: string, rest: string) => {
    const d: KeyDraft = {
      number: n,
      letter: letter.toUpperCase() as Letter,
      explanation: rest ? [rest] : [],
      sources: [],
      code: '',
      indicator: [],
      in: 'explanation',
    };
    if (entries.has(n)) duplicates.push(n);
    entries.set(n, d);
    return d;
  };

  for (const text of lines) {
    if (COMPACT_KEY.test(text)) {
      for (const m of text.matchAll(/(\d{1,3})\s*[.)]\s*([A-D])/g)) start(Number(m[1]), m[2], '');
      cur = null;
      continue;
    }

    const k = keyEntry(text);
    if (k && k.n > last && (last === 0 || k.n <= last + 5)) {
      cur = start(k.n, k.letter, k.rest);
      last = k.n;
      continue;
    }
    if (!cur) continue;

    // "SOURCE: FI:337 Explain types of financial markets (e.g., …" or a bare "FI:337" line.
    const src = SOURCE_LINE.exec(text);
    const content = src ? src[1].trim() : text;
    const code = CODE_AT_START.exec(content);
    if (code && (src || text.length <= 160)) {
      if (!cur.code) {
        cur.code = `${code[1]}:${code[2]}`;
        const title = content.slice(code[0].length).replace(/^[\s\u2013\u2014:-]+/, '');
        cur.indicator = title ? [title] : [];
      }
      cur.in = 'indicator';
      continue;
    }
    if (src) {
      if (content) cur.sources.push([content]);
      cur.in = 'source';
      continue;
    }

    // A wrapped line continues whatever came before it.
    if (cur.in === 'source' && cur.sources.length) cur.sources[cur.sources.length - 1].push(text);
    else if (cur.in === 'indicator') cur.indicator.push(text);
    else cur.explanation.push(text);
  }
  return { entries, duplicates };
}

// -------------------------------------------------------------------- main

function listNumbers(ns: number[]): string {
  return ns.length > 12 ? `${ns.slice(0, 12).join(', ')} and ${ns.length - 12} more` : ns.join(', ');
}

export function parseExam(input: string | string[][]): ParseResult {
  const pages = toPages(input);
  const lines = toLines(pages);
  const noise = markNoise(lines, pages.length);
  const vocab = buildVocab(lines.map((l) => l.text));

  const firstQuestion = lines.findIndex((l) => questionNumber(l.text) !== null);
  const heading = firstQuestion < 0 ? -1 : lines.findIndex((l, i) => i > firstQuestion && isKeyHeading(l.text));

  const keep = (l: Line, i: number) => !noise[i] && !isKeyHeading(l.text);
  let examLines: string[];
  let keyLines: string[];
  if (heading >= 0) {
    examLines = lines.filter((l, i) => i < heading && keep(l, i)).map((l) => l.text);
    keyLines = lines.filter((l, i) => i > heading && keep(l, i)).map((l) => l.text);
  } else {
    examLines = lines.filter(keep).map((l) => l.text);
    keyLines = [];
  }

  const { drafts, keyFrom } = parseQuestions(examLines, heading < 0);
  if (keyFrom !== null) keyLines = examLines.slice(keyFrom);
  const { entries, duplicates } = parseKey(keyLines);

  const warnings: string[] = [];
  if (drafts.length === 0) {
    warnings.push('No numbered questions were found. Questions should look like "1. …" followed by options "A." to "D.".');
  }
  if (entries.size === 0 && drafts.length > 0) {
    warnings.push('No answer key was found. Add the correct answers below, or include the ANSWER KEY section and read the exam again.');
  }

  const numbers = drafts.map((d) => d.number);
  const missing: number[] = [];
  // Count from the first question found: a partial exam may start at 26.
  for (let n = Math.min(...numbers); n <= Math.max(0, ...numbers); n++) if (!numbers.includes(n)) missing.push(n);
  if (missing.length) warnings.push(`Question numbers not found: ${listNumbers(missing)}.`);

  const orphans = [...entries.keys()].filter((n) => !numbers.includes(n)).sort((a, b) => a - b);
  if (orphans.length && drafts.length) {
    warnings.push(`The answer key has entries for questions that weren't found: ${listNumbers(orphans)}.`);
  }
  if (duplicates.length) warnings.push(`The answer key lists some questions twice: ${listNumbers(duplicates)}.`);
  if (drafts.length > 0 && drafts.length !== 100) {
    warnings.push(`Found ${drafts.length} questions. DECA exams usually have 100.`);
  }

  const questions = drafts.map<ParsedQuestion>((d) => {
    const e = entries.get(d.number);
    let piCode = e?.code ?? '';
    const explanation = e ? joinLines(e.explanation, vocab) : '';
    const source = e ? e.sources.map((s) => joinLines(s, vocab)).join(' ') : '';
    if (e && !piCode) piCode = CODE_ANYWHERE.exec(`${source} ${explanation}`)?.slice(1, 3).join(':') ?? '';
    return {
      number: d.number,
      stem: joinLines(d.stem, vocab),
      options: d.options.map((o) => joinLines(o, vocab)),
      answer: e?.letter ?? '',
      explanation,
      source,
      piCode,
      piTitle: e ? joinLines(e.indicator, vocab) : '',
    };
  });

  return { questions, warnings, keyFound: entries.size > 0, info: examInfo(lines.slice(0, Math.max(0, firstQuestion)).map((l) => l.text)) };
}

const CLUSTER_NAMES: [RegExp, Cluster][] = [
  [/personal financial literacy/i, 'Personal Financial Literacy'],
  [/hospitality/i, 'Hospitality & Tourism'],
  [/entrepreneurship/i, 'Entrepreneurship'],
  [/business management/i, 'Business Management & Admin'],
  [/business admin\w*\s+core|principles/i, 'Business Admin Core'],
  [/marketing/i, 'Marketing'],
  [/finance/i, 'Finance'],
];

/** Read the cover page: "Finance Cluster Exam", "2024-2025 Competitive Events Program", "for State/Province Use", "Test Number 1312". */
export function examInfo(cover: string[]): ExamInfo {
  const info: ExamInfo = {};
  for (const line of cover) {
    const cluster = /\bexam\b/i.test(line) ? CLUSTER_NAMES.find(([re]) => re.test(line)) : undefined;
    if (cluster) {
      info.cluster = cluster[1];
      break;
    }
  }
  const text = cover.join('\n');
  const season = /(20\d\d)\s*[-\u2013\u2014/]\s*(20\d\d)\s+competitive events/i.exec(text);
  if (season) info.year = Number(season[2]);
  // "Written Exam for State/Province Use". (Every cover mentions the "chartered association advisor", so match the phrase.)
  const use = /\bfor\s+([\w/ ]{2,30}?)\s+use\b/i.exec(text)?.[1] ?? '';
  if (/ICDC|international/i.test(use)) info.level = 'ICDC';
  else if (/state|province|association/i.test(use)) info.level = 'Association';
  else if (/district|regional|chapter/i.test(use)) info.level = 'District';
  const test = /\btest\s+(?:number\s+)?(\d{3,5})\b/i.exec(text);
  if (test) info.testNumber = test[1];
  return info;
}
