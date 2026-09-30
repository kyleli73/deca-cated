// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/lib/db.ts';
import { forgetSource, htmlToText, parseArticlePage, parseFeed, saveNews, studyLinks, truncate } from '../src/lib/news.ts';
import type { NewsItem } from '../src/lib/types.ts';
import { ATOM_FEED, DECA_PAGE, PODCAST_FEED, RSS_FEED } from './fixtures/feeds.ts';

describe('parseFeed', () => {
  it('reads RSS 2.0: CDATA titles, HTML descriptions, entities, dates; skips items without links', () => {
    const items = parseFeed(RSS_FEED(), 'src', 1000);
    expect(items.map((i) => i.title)).toEqual(['Central bank holds interest rate as inflation cools', "Retailer's brand refresh wins back customers"]);
    expect(items[0]).toMatchObject({
      id: 'https://news.example.com/rates',
      sourceIds: ['src'],
      summary: 'The bank kept its key rate at 2.75% on Wednesday. Economists expect a cut next year.',
      firstSeenAt: 1000,
      audio: false,
    });
    expect(items[0].published).toBeGreaterThan(Date.now() - 3 * 3_600_000);
    expect(items[1].summary).toBe('Sales rose 8% after the rebrand & new loyalty program.');
  });

  it('reads Atom entries and podcast enclosures', () => {
    const [atom] = parseFeed(ATOM_FEED(), 'a');
    expect(atom).toMatchObject({ id: 'https://markets.example.com/startups', title: 'Start-up founders face tighter credit', audio: false });
    expect(atom.published).not.toBeNull();
    const [pod] = parseFeed(PODCAST_FEED(), 'p');
    expect(pod).toMatchObject({ id: 'https://audio.example.com/tariffs', audio: true });
  });

  it('rejects things that are not feeds', () => {
    expect(() => parseFeed('<html><body>Hello</body></html>', 'x')).toThrow(/isn't an RSS or Atom feed/);
    expect(() => parseFeed('not xml at all', 'x')).toThrow();
  });
});

describe('parseArticlePage (DECA Direct)', () => {
  it('finds article links with their headings, dates and summaries, in page order', () => {
    const items = parseArticlePage(DECA_PAGE, 'https://www.decadirect.org/recent-articles', 'deca-direct', Date.parse('2026-10-01T12:00:00Z'));
    expect(items.map((i) => [i.id, i.title])).toEqual([
      ['https://www.decadirect.org/articles/competition-prep-tips', 'Five Ways to Prepare for Your Cluster Exam'],
      ['https://www.decadirect.org/articles/finance-careers', 'Exploring Careers in Finance'],
      ['https://www.decadirect.org/articles/leadership-series', 'Emerging Leader Series: Running Great Chapter Meetings'],
    ]);
    expect(items[0].summary).toBe('Build a study plan, take timed practice exams and review every explanation.');
    expect(new Date(items[0].published!).toDateString()).toBe(new Date(2026, 8, 29).toDateString());
    expect(new Date(items[1].published!).toDateString()).toBe(new Date(2026, 8, 24).toDateString());
    expect(items[2].published).toBeNull();
    // An undated article sorts just below the article listed before it.
    expect(items[2].firstSeenAt).toBeLessThan(items[1].published!);
    expect(items[2].firstSeenAt).toBeGreaterThan(items[1].published! - 1000);
  });
});

describe('helpers', () => {
  it('links articles to DECA instructional areas', () => {
    expect(studyLinks({ title: 'Central bank holds interest rate as inflation cools', summary: '' })).toEqual(['Economics']);
    expect(studyLinks({ title: 'Insurer sued over fraud claims', summary: '' })).toEqual(['Risk Management', 'Business Law']);
    expect(studyLinks({ title: 'A quiet day', summary: '' })).toEqual([]);
  });

  it('turns HTML into text and truncates at a word', () => {
    expect(htmlToText('<p>Hello <b>world</b></p>')).toBe('Hello world');
    expect(truncate('word '.repeat(80), 40)).toMatch(/^(word ){6,}word…$/);
  });
});

describe('saveNews', () => {
  beforeEach(async () => {
    await db.news.clear();
  });
  const item = (id: string, patch: Partial<NewsItem> = {}): NewsItem => ({
    id,
    sourceIds: ['s'],
    title: id,
    summary: '',
    published: null,
    firstSeenAt: Date.now(),
    audio: false,
    ...patch,
  });

  it('keeps when you first saw and read an article, and drops old ones', async () => {
    const now = Date.now();
    await saveNews([item('a', { firstSeenAt: now - 5000 }), item('old', { published: now - 40 * 86_400_000 })], now);
    await db.news.update('a', { readAt: now - 100 });
    await saveNews([item('a', { title: 'A updated', firstSeenAt: now })], now);
    const a = await db.news.get('a');
    expect(a).toMatchObject({ title: 'A updated', firstSeenAt: now - 5000, readAt: now - 100 });
    expect(await db.news.get('old')).toBeUndefined();
  });

  it('never drops an article a source still lists, so it does not come back as new', async () => {
    const now = Date.now();
    const first = now - 40 * 86_400_000;
    await saveNews([item('undated', { firstSeenAt: first })], first);
    await saveNews([item('undated', { firstSeenAt: now })], now);
    expect((await db.news.get('undated'))?.firstSeenAt).toBe(first);
  });

  it('keeps one article listed by two sources, tied to both', async () => {
    await saveNews([item('shared', { sourceIds: ['npr-business'] }), item('shared', { sourceIds: ['planet-money'] })]);
    expect((await db.news.get('shared'))?.sourceIds).toEqual(['npr-business', 'planet-money']);
    await forgetSource('planet-money');
    expect((await db.news.get('shared'))?.sourceIds).toEqual(['npr-business']);
    await forgetSource('npr-business');
    expect(await db.news.get('shared')).toBeUndefined();
  });
});
