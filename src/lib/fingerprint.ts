/** Loose form of a question's text for duplicate matching: case, accents, punctuation and spacing ignored. */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ') // keep decimal points: "2.5" is not "25"
    .replace(/[^a-z0-9%$.]+/g, ' ')
    .trim();
}

function cyrb53(str: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Same question = same stem and same four options, in any order (exams
 * sometimes shuffle the options of a repeated question).
 */
export function fingerprint(stem: string, options: string[]): string {
  const key = `${normalizeForMatch(stem)}|${options.map(normalizeForMatch).sort().join('|')}`;
  return cyrb53(key, 1).toString(36) + cyrb53(key, 2).toString(36);
}
