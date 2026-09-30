const LIGATURES: Record<string, string> = {
  'ﬀ': 'ff',
  'ﬁ': 'fi',
  'ﬂ': 'fl',
  'ﬃ': 'ffi',
  'ﬄ': 'ffl',
  'ﬅ': 'st',
  'ﬆ': 'st',
};

/** Fix the character-level mess PDF text extraction produces. */
export function normalizeChars(s: string): string {
  return s
    .replace(/[ﬀ-ﬆ]/g, (c) => LIGATURES[c] ?? c)
    .replace(/[  -   　\t]/g, ' ')
    .replace(/[​-‍⁠﻿­]/g, '')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/−/g, '-')
    .replace(/…/g, '...');
}

export function cleanLine(s: string): string {
  return normalizeChars(s).replace(/\s+/g, ' ').trim();
}

/** Lower-cased words (hyphenated compounds kept whole) used to undo line-end hyphenation. */
export function buildVocab(lines: string[]): Set<string> {
  const vocab = new Set<string>();
  for (const line of lines) {
    for (const w of line.toLowerCase().match(/[a-z]+(?:-[a-z]+)*/g) ?? []) vocab.add(w);
  }
  return vocab;
}

/**
 * Join wrapped lines back into one paragraph.
 *
 * A line ending in "-" is usually a hyphenated compound split at its hyphen
 * ("long-" + "term"), so the hyphen is kept. It is dropped only when the
 * document elsewhere spells the joined word without it ("finan-" + "cial").
 */
export function joinLines(lines: string[], vocab: Set<string> = new Set()): string {
  let out = '';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!out) {
      out = line;
      continue;
    }
    // A URL broken across lines is re-joined exactly: no space, hyphen kept.
    const lastToken = out.slice(out.lastIndexOf(' ') + 1);
    const nextToken = line.split(' ')[0];
    if (/:\/\/|^www\./i.test(lastToken) && (/[-/_.=?&%#~]$/.test(lastToken) || /^[\w~%-]*[/._=?&-][\w./~%?=&#-]*$/.test(nextToken))) {
      out += line;
      continue;
    }
    const hyphen = /([A-Za-z]+)-$/.exec(out);
    const next = /^([a-z]+)/.exec(line);
    if (hyphen && next) {
      const joined = (hyphen[1] + next[1]).toLowerCase();
      const compound = `${hyphen[1]}-${next[1]}`.toLowerCase();
      out = vocab.has(joined) && !vocab.has(compound) ? out.slice(0, -1) + line : out + line;
    } else if (/[—/]$/.test(out) || /^[—,.;:)]/.test(line)) {
      out += line;
    } else {
      out += ' ' + line;
    }
  }
  return out;
}
