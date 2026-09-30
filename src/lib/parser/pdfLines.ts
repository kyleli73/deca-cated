/** The parts of a pdf.js TextItem needed to rebuild lines. */
export interface TextItemLike {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/**
 * Rebuild visual lines from pdf.js text items. Items are grouped by baseline
 * (y) and ordered left to right; a space is inserted where there is a visible
 * gap between two items (e.g. between "A." and the option text at a tab stop).
 */
export function itemsToLines(items: TextItemLike[]): string[] {
  const words = items
    .filter((it) => it.str.length > 0)
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width,
      h: Math.abs(it.height || it.transform[3]) || 10,
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: (typeof words)[] = [];
  for (const w of words) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].y - w.y) <= Math.max(2, row[0].h * 0.4)) row.push(w);
    else rows.push([w]);
  }

  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    let line = '';
    let end = -Infinity;
    for (const w of row) {
      const gap = w.x - end;
      if (line && gap > w.h * 0.15 && !line.endsWith(' ') && !w.str.startsWith(' ')) line += ' ';
      line += w.str;
      end = w.x + w.w;
    }
    return line.replace(/\s+/g, ' ').trim();
  });
}
