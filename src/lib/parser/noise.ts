/**
 * Detect page furniture (running headers, footers, page numbers, copyright
 * lines) so it can be dropped before parsing. Works on PDF pages and on
 * pasted text, where page breaks are usually lost and headers end up
 * in the middle of questions.
 */

export interface Line {
  text: string;
  page: number;
  /** Position among the non-empty lines of its page. */
  pos: number;
  /** Non-empty lines on its page. */
  pageLen: number;
}

/** Lines that must never be treated as noise: they carry exam structure (including bare "FI:093" key lines). */
const STRUCTURAL = /^(\d{1,3}\s*[.)]|\(?[A-D]\s*[.)]|SOURCE\s*:|\(?[A-Z]{2,3}\s?:\s?\d{3}\b)/i;

export function signature(text: string): string {
  return text
    .toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/[^a-z#]+/g, ' ')
    .trim();
}

export function isPageNumber(text: string): boolean {
  return (
    /^(page\s*)?\d{1,3}(\s*(of|\/)\s*\d{1,3})?$/i.test(text) ||
    /^[-–—]\s*\d{1,3}\s*[-–—]$/.test(text)
  );
}

export function isCopyright(text: string): boolean {
  return (
    (/^(copyright|©|\(c\))/i.test(text) && /\d{4}/.test(text)) ||
    /MBA Research and Curriculum Center/i.test(text)
  );
}

function capsRatio(text: string): number {
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (!letters) return 0;
  return letters.replace(/[^A-Z]/g, '').length / letters.length;
}

const EDGE = 3;

export function markNoise(lines: Line[], pageCount: number): boolean[] {
  const total = new Map<string, number>();
  const pagesWithEdge = new Map<string, Set<number>>();
  for (const l of lines) {
    const sig = signature(l.text);
    total.set(sig, (total.get(sig) ?? 0) + 1);
    if (l.pos < EDGE || l.pos >= l.pageLen - EDGE) {
      const set = pagesWithEdge.get(sig) ?? new Set<number>();
      set.add(l.page);
      pagesWithEdge.set(sig, set);
    }
  }
  const pageThreshold = Math.max(2, Math.ceil(pageCount * 0.3));

  const noise = lines.map((l) => {
    const text = l.text;
    if (isCopyright(text)) return true;
    if (STRUCTURAL.test(text) || isPageNumber(text)) return false; // page numbers: second pass
    const sig = signature(text);
    const atEdge = l.pos < EDGE || l.pos >= l.pageLen - EDGE;

    const words = sig.split(' ').filter(Boolean).length;
    const short = text.length <= 60 && words <= 8;

    // Real PDF pages: a short line repeated at the top/bottom of many pages.
    if (pageCount > 1 && atEdge && short && (pagesWithEdge.get(sig)?.size ?? 0) >= pageThreshold) return true;

    // Pasted text: running headers still repeat, and are ALL CAPS or "Test 1255".
    if ((total.get(sig) ?? 0) >= 3 && short) {
      if ((words >= 2 && capsRatio(text) >= 0.6) || /^(test|page) #( of #)?$/.test(sig)) return true;
    }
    return false;
  });

  // A bare number is a page number only at the very top/bottom of a PDF page or
  // next to other page furniture; otherwise it's content (e.g. an option "250"
  // that wrapped onto its own line).
  return lines.map((l, i) => {
    if (noise[i] || !isPageNumber(l.text)) return noise[i];
    if (/^page\b/i.test(l.text)) return true;
    const pageEdge = pageCount > 1 && (l.pos === 0 || l.pos === l.pageLen - 1);
    const besideNoise = (j: number) => j >= 0 && j < lines.length && lines[j].page === l.page && noise[j];
    return pageEdge || besideNoise(i - 1) || besideNoise(i + 1);
  });
}
