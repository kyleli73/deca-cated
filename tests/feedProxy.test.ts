import { describe, expect, it } from 'vitest';
import { checkUrl, isFromApp, isPrivateAddress, publicLookup } from '../vite-plugins/feedProxy.ts';

describe('feed fetcher guards', () => {
  it('treats everything that is not the public internet as private', () => {
    for (const ip of [
      '127.0.0.1',
      '10.1.2.3',
      '192.168.0.10',
      '172.20.0.1',
      '169.254.169.254',
      '0.0.0.0',
      '198.18.0.1',
      '100.64.0.1',
      '::1',
      '::',
      'fd00::1',
      'fe80::1',
      'fe90::1',
      'fec0::1',
      '::ffff:127.0.0.1',
      '::ffff:7f00:1', // the form the URL parser turns [::ffff:127.0.0.1] into
      '::ffff:c0a8:101',
      '::127.0.0.1',
      '64:ff9b::7f00:1',
      '2002:7f00:1::',
      '2001::1',
      'not-an-ip',
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ['151.101.1.1', '8.8.8.8', '172.32.0.1', '2606:4700::1', '2a04:4e42::81']) expect(isPrivateAddress(ip), ip).toBe(false);
  });

  it('only fetches public http(s) addresses', () => {
    expect(checkUrl('https://www.cbc.ca/webfeed/rss/rss-business')).toBeInstanceOf(URL);
    const status = (u: string) => {
      try {
        checkUrl(u);
        return 200;
      } catch (e) {
        return (e as { status: number }).status;
      }
    };
    expect(status('ftp://example.com/feed')).toBe(400);
    expect(status('not a url')).toBe(400);
    expect(status('https://user:pw@example.com/')).toBe(400);
    for (const u of [
      'http://localhost:5173/',
      'http://printer.local/',
      'http://router/',
      'http://192.168.1.1/admin',
      'http://[::1]/',
      'http://[::ffff:127.0.0.1]:5173/',
      'http://[::ffff:192.168.1.1]/',
      'http://[64:ff9b::127.0.0.1]/',
      'http://[fe90::1]/',
    ]) {
      expect(status(u), u).toBe(403);
    }
  });

  it('refuses a hostname whose DNS answer is private when connecting (no rebinding)', async () => {
    const err = await new Promise<Error | null>((resolve) => publicLookup('localhost', { family: 0 }, (e) => resolve(e)));
    expect(err?.message).toBe('Addresses on a private network are not allowed.');
  });

  it("serves only the app's own background requests", () => {
    expect(isFromApp({ host: 'localhost:5173', 'sec-fetch-site': 'same-origin', 'sec-fetch-dest': 'empty' })).toBe(true);
    expect(isFromApp({ host: 'localhost:5173' })).toBe(true);
    expect(isFromApp({ host: 'localhost:5173', origin: 'http://localhost:5173' })).toBe(true);
    expect(isFromApp({ host: 'localhost:5173', 'sec-fetch-site': 'cross-site' })).toBe(false);
    expect(isFromApp({ host: 'localhost:5173', 'sec-fetch-site': 'none' })).toBe(false); // a link opened from an email
    expect(isFromApp({ host: 'localhost:5173', 'sec-fetch-site': 'same-origin', 'sec-fetch-dest': 'document' })).toBe(false);
    expect(isFromApp({ host: 'localhost:5173', origin: 'https://evil.example' })).toBe(false);
  });
});
