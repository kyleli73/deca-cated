import { expect, test } from '@playwright/test';
import { ATOM_FEED, DECA_PAGE, PODCAST_FEED, RSS_FEED } from '../tests/fixtures/feeds.ts';

test('News page: DECA articles, topics, study links, read state, sources and offline fallback', async ({ page }) => {
  const feeds: Record<string, [string, string]> = {
    'https://www.cbc.ca/webfeed/rss/rss-business': ['application/rss+xml', RSS_FEED()],
    'https://feeds.bbci.co.uk/news/business/rss.xml': ['application/atom+xml', ATOM_FEED()],
    'https://feeds.npr.org/510325/podcast.xml': ['application/rss+xml', PODCAST_FEED()],
    'https://www.decadirect.org/recent-articles': ['text/html; charset=utf-8', DECA_PAGE],
  };
  let online = true;
  const asked: string[] = [];
  // The news sites can't be reached from tests, so answer for the app's local fetcher.
  await page.route('**/api/fetch?*', async (route) => {
    const url = new URL(route.request().url()).searchParams.get('url')!;
    asked.push(url);
    if (!online) return route.abort('internetdisconnected');
    const hit = feeds[url];
    if (!hit) return route.fulfill({ status: 502, contentType: 'text/plain', body: `${new URL(url).hostname} answered 404.` });
    return route.fulfill({ status: 200, contentType: hit[0], body: hit[1] });
  });

  await page.goto('/#/news');
  await expect(page.getByRole('heading', { name: 'News', exact: true })).toBeVisible();

  // DECA Direct has no RSS feed: the app tries one, then reads the article list page.
  await expect(page.getByRole('heading', { name: 'From DECA Direct' })).toBeVisible();
  expect(asked).toContain('https://www.decadirect.org/articles/rss.xml');
  const deca = page.locator('.news-item.compact');
  await expect(deca).toHaveCount(3);
  await expect(deca.first()).toContainText('Five Ways to Prepare for Your Cluster Exam');

  const rates = page.locator('.news-item', { has: page.getByRole('link', { name: 'Central bank holds interest rate as inflation cools' }) });
  await expect(rates.getByRole('link')).toHaveAttribute('href', 'https://news.example.com/rates');
  await expect(rates.getByRole('link')).toHaveAttribute('target', '_blank');
  await expect(rates).toContainText('CBC Business');
  await expect(rates.locator('.tag')).toHaveText(['Economics']);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.locator('.news-item', { hasText: 'What is a tariff, really?' })).toContainText('Listen');

  // Sources that failed say so; the rest still load.
  await expect(page.locator('.source-list li', { hasText: 'NPR Business' })).toContainText("Couldn't load: feeds.npr.org answered 404.");
  await expect(page.locator('.source-list li', { hasText: 'CBC Business' })).toContainText('2 articles');
  await expect(page.locator('.source-list li', { hasText: 'BBC Business' })).toContainText('1 article');

  // Topics
  await page.getByRole('button', { name: 'Economy explained' }).click();
  await expect(page.locator('.news-item')).toHaveCount(1);
  await expect(page.locator('.news-item')).toContainText('What is a tariff, really?');
  await page.getByRole('button', { name: 'DECA', exact: true }).click();
  await expect(page.locator('.news-item')).toHaveCount(3);
  await page.getByRole('button', { name: 'All', exact: true }).click();

  // Opening an article marks it as read.
  const [popup] = await Promise.all([page.context().waitForEvent('page'), rates.getByRole('link').click()]);
  await popup.close();
  await expect(rates).toHaveClass(/read/);

  // Turning a source off hides its articles.
  await page.getByRole('checkbox', { name: 'CBC Business' }).uncheck();
  await expect(page.getByRole('link', { name: 'Central bank holds interest rate as inflation cools' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'CBC Business' }).check();
  await expect(rates).toBeVisible();

  // Add and remove your own feed.
  await page.getByLabel('Name').fill('My feed');
  await page.getByLabel('Feed address (RSS or Atom)').fill('https://custom.example.com/feed.xml');
  await page.getByRole('button', { name: 'Add feed' }).click();
  const mine = page.locator('.source-list li', { hasText: 'My feed' });
  await expect(mine).toContainText("Couldn't load: custom.example.com answered 404.");
  await mine.getByRole('button', { name: 'Remove' }).click();
  await expect(mine).toHaveCount(0);

  // Offline: saved articles stay, with a note.
  online = false;
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByText("Couldn't reach the news sites.")).toBeVisible();
  await expect(page.getByText('Showing the articles saved last time.')).toBeVisible();
  await expect(rates).toBeVisible();
  await expect(deca).toHaveCount(3);
});

test('the local feed fetcher only serves the app and only public addresses', async ({ request }) => {
  const get = (url: string, headers?: Record<string, string>) => request.get(`/api/fetch?url=${encodeURIComponent(url)}`, { headers });
  const local = await get('http://127.0.0.1:5173/');
  expect(local.status()).toBe(403);
  expect(await local.text()).toBe('Addresses on a private network are not allowed.');
  expect((await get('http://localhost:5173/')).status()).toBe(403);
  expect((await get('ftp://example.com/feed')).status()).toBe(400);
  const cross = await get('https://example.com/feed', { 'sec-fetch-site': 'cross-site' });
  expect(cross.status()).toBe(403);
  expect(await cross.text()).toBe('Only DECA Study can use this.');
  // A link opened directly (e.g. from an email) can't use it either.
  expect((await get('https://example.com/feed', { 'sec-fetch-site': 'none', 'sec-fetch-dest': 'document' })).status()).toBe(403);
  // IPv4 hidden inside IPv6 is still a local address.
  expect((await get('http://[::ffff:127.0.0.1]:5173/')).status()).toBe(403);
  // Nothing it returns is ever rendered as a page.
  expect(local.headers()['x-content-type-options']).toBe('nosniff');
  expect(local.headers()['content-security-policy']).toContain('sandbox');
});
