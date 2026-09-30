import { db } from './db.ts';
import { getSettings, updateSettings } from './repo.ts';
import type { NewsItem, Settings } from './types.ts';

export type Topic = 'deca' | 'news' | 'explained';

export interface NewsSource {
  id: string;
  name: string;
  /** An RSS/Atom feed, or for kind 'page' a web page listing articles. */
  url: string;
  kind: 'feed' | 'page';
  topic: Topic;
  /** For 'page' sources: a feed to try first, in case the site adds one. */
  feedUrl?: string;
  custom?: boolean;
}

export const TOPICS: { value: Topic | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'deca', label: 'DECA' },
  { value: 'news', label: 'Business news' },
  { value: 'explained', label: 'Economy explained' },
];

export const DEFAULT_SOURCES: NewsSource[] = [
  {
    id: 'deca-direct',
    name: 'DECA Direct',
    kind: 'page',
    url: 'https://www.decadirect.org/recent-articles',
    feedUrl: 'https://www.decadirect.org/articles/rss.xml',
    topic: 'deca',
  },
  { id: 'cbc-business', name: 'CBC Business', kind: 'feed', url: 'https://www.cbc.ca/webfeed/rss/rss-business', topic: 'news' },
  { id: 'bbc-business', name: 'BBC Business', kind: 'feed', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', topic: 'news' },
  { id: 'npr-business', name: 'NPR Business', kind: 'feed', url: 'https://feeds.npr.org/1006/rss.xml', topic: 'news' },
  { id: 'the-indicator', name: 'The Indicator (NPR)', kind: 'feed', url: 'https://feeds.npr.org/510325/podcast.xml', topic: 'explained' },
  { id: 'planet-money', name: 'Planet Money (NPR)', kind: 'feed', url: 'https://feeds.npr.org/510289/podcast.xml', topic: 'explained' },
];

export function allSources(settings: Pick<Settings, 'newsCustom'>): NewsSource[] {
  return [...DEFAULT_SOURCES, ...settings.newsCustom.map((c) => ({ ...c, kind: 'feed' as const, topic: 'news' as const, custom: true }))];
}

// ------------------------------------------------------------------ parsing

const MAX_ITEMS_PER_SOURCE = 30;

function clean(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

/** Text of an element with a space between each piece, so "<div>Finance</div><div>Sep 24</div>" doesn't run together. */
function spacedText(el: Element | null | undefined): string {
  if (!el) return '';
  const parts: string[] = [];
  const walker = el.ownerDocument.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */);
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? '');
  return clean(parts.join(' '));
}

/** Plain text from an HTML snippet (feed descriptions are often HTML). */
export function htmlToText(html: string): string {
  if (!/[<&]/.test(html)) return clean(html);
  return clean(new DOMParser().parseFromString(html, 'text/html').body.textContent);
}

export function truncate(s: string, max = 240): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).replace(/[\s,.;:]+$/, '')}…`;
}

const XML_ENTITIES = new Set(['amp', 'lt', 'gt', 'quot', 'apos']);
const entityCache = new Map<string, string>();

/** Feeds often use HTML entities like &nbsp; that aren't valid XML; turn them into characters first. */
function fixEntities(xml: string): string {
  return xml.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name: string) => {
    if (XML_ENTITIES.has(name)) return m;
    let out = entityCache.get(name);
    if (out === undefined) {
      const ch = new DOMParser().parseFromString(`<p>${m}</p>`, 'text/html').body.textContent ?? '';
      out = ch && ch !== m ? `&#${ch.codePointAt(0)};` : `&amp;${name};`;
      entityCache.set(name, out);
    }
    return out;
  });
}

function child(el: Element, ...names: string[]): Element | undefined {
  for (const name of names) {
    const found = Array.from(el.children).find((c) => c.localName === name || c.nodeName === name);
    if (found) return found;
  }
  return undefined;
}

function parseDate(s: string | null | undefined): number | null {
  const t = Date.parse(clean(s));
  return Number.isFinite(t) ? t : null;
}

/** RSS 2.0, RSS 1.0 (RDF) or Atom → articles. Throws if the text isn't a feed. */
export function parseFeed(text: string, sourceId: string, now = Date.now()): NewsItem[] {
  const doc = new DOMParser().parseFromString(fixEntities(text.replace(/^﻿/, '').trim()), 'application/xml');
  const root = doc.documentElement;
  if (!root || doc.getElementsByTagName('parsererror').length || !/^(rss|feed|RDF)$/i.test(root.localName)) {
    throw new Error("This address isn't an RSS or Atom feed.");
  }
  const entries = Array.from(doc.getElementsByTagName('*')).filter((el) => el.localName === 'item' || el.localName === 'entry');
  const items: NewsItem[] = [];
  for (const el of entries.slice(0, MAX_ITEMS_PER_SOURCE)) {
    const title = htmlToText(child(el, 'title')?.textContent ?? '');
    const atomLinks = Array.from(el.children).filter((c) => c.localName === 'link' && c.getAttribute('href'));
    const atomLink = atomLinks.find((l) => !l.getAttribute('rel') || l.getAttribute('rel') === 'alternate') ?? atomLinks[0];
    const guid = child(el, 'guid');
    const enclosure = child(el, 'enclosure');
    const link =
      atomLink?.getAttribute('href') ??
      clean(child(el, 'link')?.textContent) ??
      '';
    const href =
      link ||
      (guid && guid.getAttribute('isPermaLink') !== 'false' && /^https?:/.test(clean(guid.textContent)) ? clean(guid.textContent) : '') ||
      enclosure?.getAttribute('url') ||
      '';
    if (!title || !/^https?:\/\//.test(href)) continue;
    const summary = htmlToText(child(el, 'description', 'summary', 'encoded', 'content')?.textContent ?? '');
    items.push({
      id: href,
      sourceIds: [sourceId],
      title,
      summary: truncate(summary === title ? '' : summary),
      published: parseDate(child(el, 'pubDate', 'published', 'updated', 'date', 'issued')?.textContent),
      firstSeenAt: now,
      audio: /^audio\//.test(enclosure?.getAttribute('type') ?? ''),
    });
  }
  return items;
}

const MONTH_DATE = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\b/;

/**
 * Articles from a page that lists them (DECA Direct has no RSS feed): links
 * to /articles/<slug>, titled by the heading in the link or its card, with a
 * date and summary if the card shows them. Page order is kept (newest first).
 */
export function parseArticlePage(html: string, pageUrl: string, sourceId: string, now = Date.now()): NewsItem[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const found = new Map<string, NewsItem>();
  for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
    let url: URL;
    try {
      url = new URL(a.getAttribute('href')!, pageUrl);
    } catch {
      continue;
    }
    if (!/^\/articles\/[^/]+\/?$/.test(url.pathname)) continue;
    const href = `${url.origin}${url.pathname}`;
    const card = a.closest('article, li, [role="listitem"], .w-dyn-item, [class*="card" i]') ?? a.parentElement;
    const heading = a.querySelector('h1, h2, h3, h4, h5, h6') ?? card?.querySelector('h1, h2, h3, h4, h5, h6');
    const title = clean(heading?.textContent) || spacedText(a);
    if (title.length < 8 || title.length > 200) continue;
    const prev = found.get(href);
    if (prev && prev.title.length >= title.length && !heading) continue;
    const cardText = spacedText(card);
    const summary = clean(card?.querySelector('p')?.textContent);
    found.set(href, {
      id: href,
      sourceIds: [sourceId],
      title,
      summary: truncate(summary && summary !== title ? summary : ''),
      published: parseDate(MONTH_DATE.exec(cardText)?.[0]),
      firstSeenAt: now,
      audio: false,
    });
  }
  // The page lists newest first, so an undated article sorts just below the
  // article before it (and undated pages keep their order).
  const items = [...found.values()].slice(0, MAX_ITEMS_PER_SOURCE);
  let before = now;
  items.forEach((item, i) => {
    if (item.published !== null) before = Math.min(before, item.published);
    else item.firstSeenAt = before - (i + 1);
  });
  return items;
}

// ------------------------------------------------------------ study links

const STUDY_LINKS: [string, RegExp][] = [
  ['Economics', /\b(inflation|interest rates?|central bank|bank of canada|federal reserve|the fed|gdp|recession|tariffs?|trade war|unemployment|jobs report|economy|economic|supply chain|consumer prices?)\b/i],
  ['Financial Analysis', /\b(stocks?|shares|bonds?|earnings|dividends?|ipo|investors?|investing|mortgages?|loans?|credit|debt|budget|savings|tsx|s&p 500|dow|nasdaq)\b/i],
  ['Risk Management', /\b(insurance|insurers?|fraud|scams?|cyber ?attacks?|hack(?:ed|ers?)?|data breach)\b/i],
  ['Business Law', /\b(lawsuits?|sued|court|antitrust|regulators?|regulations?|competition bureau|ruling|fined?)\b/i],
  ['Marketing', /\b(brands?|advertising|marketing|retailers?|consumers?|customers?)\b/i],
  ['Human Resources', /\b(hiring|layoffs?|laid off|unions?|strikes?|workers|wages|employees)\b/i],
  ['Entrepreneurship', /\b(start-?ups?|founders?|small business(?:es)?|entrepreneurs?)\b/i],
];

/** Up to two DECA instructional areas an article touches on, as a study nudge. */
export function studyLinks(item: Pick<NewsItem, 'title' | 'summary'>): string[] {
  const text = `${item.title} ${item.summary}`;
  return STUDY_LINKS.filter(([, re]) => re.test(text))
    .map(([name]) => name)
    .slice(0, 2);
}

// ---------------------------------------------------------------- fetching

/** Decode with the charset from the header or the XML prolog (some feeds aren't UTF-8). */
function decode(buf: ArrayBuffer, contentType: string | null): string {
  const head = new TextDecoder('latin1').decode(buf.slice(0, 200));
  const charset = /charset=["']?([\w-]+)/i.exec(contentType ?? '')?.[1] ?? /encoding=["']([\w-]+)["']/i.exec(head)?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    return new TextDecoder('utf-8').decode(buf);
  }
}

async function get(url: string): Promise<string> {
  // The local fetcher returns raw bytes; the site's own content type comes in x-upstream-content-type.
  let res: Response;
  try {
    res = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`, { cache: 'no-store' });
  } catch {
    throw new Error('offline');
  }
  // Without the app's local server (e.g. the installed app opened on its own) this path isn't there.
  if (res.status === 404) throw new Error('offline');
  if (!res.ok) throw new Error((await res.text()) || `Error ${res.status}`);
  return decode(await res.arrayBuffer(), res.headers.get('x-upstream-content-type') ?? res.headers.get('content-type'));
}

export async function fetchSource(source: NewsSource, now = Date.now()): Promise<NewsItem[]> {
  if (source.kind === 'feed') return parseFeed(await get(source.url), source.id, now);
  if (source.feedUrl) {
    try {
      const items = parseFeed(await get(source.feedUrl), source.id, now);
      if (items.length) return items;
    } catch {
      // No feed yet: read the article list page instead.
    }
  }
  const items = parseArticlePage(await get(source.url), source.url, source.id, now);
  if (!items.length) throw new Error('No articles found on the page.');
  return items;
}

export type SourceStatus = { ok: true; count: number } | { ok: false; error: string };

const KEEP_DAYS = 30;
const KEEP_MAX = 600;

/** One entry per link, listing every source that carries it. */
function mergeBySource(items: NewsItem[]): NewsItem[] {
  const byId = new Map<string, NewsItem>();
  for (const i of items) {
    const prev = byId.get(i.id);
    byId.set(i.id, prev ? { ...prev, sourceIds: [...new Set([...prev.sourceIds, ...i.sourceIds])] } : i);
  }
  return [...byId.values()];
}

/**
 * Save fetched articles, keeping when you first saw and read each one. Old
 * articles are dropped, but never ones a source still lists (otherwise an
 * undated article would come back as new).
 */
export async function saveNews(fetched: NewsItem[], now = Date.now()): Promise<void> {
  const merged = mergeBySource(fetched);
  await db.transaction('rw', db.news, async () => {
    const existing = new Map((await db.news.bulkGet(merged.map((i) => i.id))).filter((x): x is NewsItem => !!x).map((x) => [x.id, x]));
    await db.news.bulkPut(
      merged.map((i) => {
        const old = existing.get(i.id);
        return old ? { ...i, sourceIds: [...new Set([...old.sourceIds, ...i.sourceIds])], firstSeenAt: old.firstSeenAt, readAt: old.readAt } : i;
      }),
    );
    const current = new Set(merged.map((i) => i.id));
    const cutoff = now - KEEP_DAYS * 86_400_000;
    const sorted = (await db.news.toArray()).sort((a, b) => sortTime(b) - sortTime(a));
    const drop = sorted.filter((x, i) => !current.has(x.id) && (i >= KEEP_MAX || sortTime(x) < cutoff)).map((x) => x.id);
    await db.news.bulkDelete(drop);
  });
}

/** Forget a source's articles (after removing a custom feed); articles other sources also list stay. */
export async function forgetSource(sourceId: string): Promise<void> {
  await db.transaction('rw', db.news, async () => {
    const items = await db.news.where('sourceIds').equals(sourceId).toArray();
    const left = items.map((i) => ({ ...i, sourceIds: i.sourceIds.filter((s) => s !== sourceId) }));
    await db.news.bulkDelete(left.filter((i) => !i.sourceIds.length).map((i) => i.id));
    await db.news.bulkPut(left.filter((i) => i.sourceIds.length));
  });
}

export function sortTime(i: Pick<NewsItem, 'published' | 'firstSeenAt'>): number {
  return i.published ?? i.firstSeenAt;
}

/** Fetch every enabled source in parallel. One failing source doesn't stop the rest. */
export async function refreshNews(): Promise<Map<string, SourceStatus>> {
  const settings = await getSettings();
  const sources = allSources(settings).filter((s) => !settings.newsDisabled.includes(s.id));
  const now = Date.now();
  const results = await Promise.allSettled(sources.map((s) => fetchSource(s, now)));
  const status = new Map<string, SourceStatus>();
  const items: NewsItem[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      status.set(sources[i].id, { ok: true, count: r.value.length });
      items.push(...r.value);
    } else {
      status.set(sources[i].id, { ok: false, error: r.reason instanceof Error ? r.reason.message : String(r.reason) });
    }
  });
  if (items.length) await saveNews(items, now);
  if ([...status.values()].some((s) => s.ok)) await updateSettings({ newsFetchedAt: now });
  return status;
}

export async function markRead(id: string): Promise<void> {
  await db.news.update(id, { readAt: Date.now() });
}
