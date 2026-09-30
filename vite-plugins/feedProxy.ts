/**
 * News sites don't let a web page read their RSS feeds directly (CORS), so the
 * app's own local server (`npm run dev` / `npm run app`) fetches them:
 *
 *   GET /api/fetch?url=https://www.cbc.ca/webfeed/rss/rss-business
 *
 * It only runs on your computer. Guards:
 * - Only the app's own background requests are served, never another website
 *   and never a page opened directly (so a crafted link can't use it).
 * - Only public http(s) addresses: the address is checked when connecting (so
 *   DNS tricks can't point it at your computer or home network), and again on
 *   every redirect.
 * - Responses go back as inert bytes the browser won't render or run.
 * - 3 MB and 12 s per response; results cached for 10 minutes.
 */
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 12_000;
const CACHE_MS = 10 * 60_000;
const CACHE_MAX = 60;
const USER_AGENT = 'Mozilla/5.0 (compatible; DECA-Study/1.0; personal news reader)';

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Everything that isn't the public internet (RFC 6890 special-purpose ranges).
 * Two lists: BlockList matches IPv4 addresses against IPv6 rules as
 * ::ffff:a.b.c.d, and every IPv4-mapped address is blocked below.
 */
const NOT_PUBLIC_V4 = new BlockList();
const NOT_PUBLIC_V6 = new BlockList();
for (const [net, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  NOT_PUBLIC_V4.addSubnet(net, bits, 'ipv4');
}
// IPv6, including every form that embeds an IPv4 address (mapped, compatible,
// NAT64, 6to4, Teredo): a real news site never needs those.
for (const [net, bits] of [
  ['::', 96],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const) {
  NOT_PUBLIC_V6.addSubnet(net, bits, 'ipv6');
}

export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (!family) return true;
  return family === 6 ? NOT_PUBLIC_V6.check(ip, 'ipv6') : NOT_PUBLIC_V4.check(ip, 'ipv4');
}

/** Parse and vet a URL the app asked for. Throws HttpError unless it's a public http(s) address. */
export function checkUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, 'That is not a valid web address.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new HttpError(400, 'Only http and https addresses can be fetched.');
  if (url.username || url.password) throw new HttpError(400, 'Addresses with a username or password are not allowed.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || /\.(localhost|local|internal|home|lan)$/i.test(host) || !host.includes('.') && !isIP(host)) {
    throw new HttpError(403, 'Local addresses are not allowed.');
  }
  if (isIP(host) && isPrivateAddress(host)) throw new HttpError(403, 'Addresses on a private network are not allowed.');
  return url;
}

/** DNS lookup that refuses non-public answers. Used for the actual connection, so rebinding can't slip past. */
export const publicLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 4);
    const list = addresses as dns.LookupAddress[];
    if (!list.length || list.some((a) => isPrivateAddress(a.address))) {
      const e = Object.assign(new Error('Addresses on a private network are not allowed.'), { code: 'EPRIVATE' });
      return callback(e, '', 4);
    }
    if (options.all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

interface Fetched {
  type: string;
  body: Buffer;
}

function getOnce(url: URL): Promise<{ status: number; location?: string; type: string; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(
      url,
      {
        lookup: publicLookup,
        timeout: TIMEOUT_MS,
        headers: {
          'user-agent': USER_AGENT,
          accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume(); // discard the body so the connection is released
          return resolve({ status, location: res.headers.location, type: '', body: Buffer.alloc(0) });
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy(new HttpError(502, 'The feed is too large.'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve({ status, type: String(res.headers['content-type'] ?? ''), body: Buffer.concat(chunks) }));
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new HttpError(504, 'The site took too long to answer.')));
    req.on('error', (e: Error & { code?: string }) => {
      if (e instanceof HttpError) reject(e);
      else if (e.code === 'EPRIVATE') reject(new HttpError(403, e.message));
      else if (e.code === 'ENOTFOUND' || e.code === 'EAI_AGAIN') reject(new HttpError(502, `Couldn't find ${url.hostname}. Check your internet connection.`));
      else reject(new HttpError(502, `Couldn't reach ${url.hostname}.`));
    });
  });
}

async function fetchPublic(start: URL): Promise<Fetched> {
  let url = start;
  for (let hop = 0; hop < 5; hop++) {
    const res = await getOnce(url);
    if (res.location) {
      url = checkUrl(new URL(res.location, url).href);
      continue;
    }
    if (res.status < 200 || res.status >= 300) throw new HttpError(502, `${url.hostname} answered ${res.status}.`);
    return { type: res.type, body: res.body };
  }
  throw new HttpError(502, 'Too many redirects.');
}

/**
 * Only the app's own background requests (fetch from a page on this server).
 * Not other websites, and not pages opened directly, e.g. a link in an email.
 */
export function isFromApp(headers: IncomingMessage['headers']): boolean {
  const site = headers['sec-fetch-site'];
  if (site && site !== 'same-origin') return false;
  const dest = headers['sec-fetch-dest'];
  if (dest && dest !== 'empty') return false;
  const origin = headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== headers.host) return false;
    } catch {
      return false;
    }
  }
  return true;
}

const cache = new Map<string, Fetched & { at: number }>();

function remember(key: string, value: Fetched): Fetched {
  const now = Date.now();
  for (const [k, v] of cache) if (now - v.at > CACHE_MS) cache.delete(k);
  while (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, { ...value, at: now });
  return value;
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('content-security-policy', "sandbox; default-src 'none'");
  try {
    if (req.method !== 'GET') throw new HttpError(405, 'Only GET is supported.');
    if (!isFromApp(req.headers)) throw new HttpError(403, 'Only DECA Study can use this.');
    const url = checkUrl(new URL(req.url ?? '', 'http://local').searchParams.get('url') ?? '');
    const hit = cache.get(url.href);
    const out = hit && Date.now() - hit.at <= CACHE_MS ? hit : remember(url.href, await fetchPublic(url));
    res.statusCode = 200;
    // Bytes only: the browser must never render a fetched page as part of the app.
    res.setHeader('content-type', 'application/octet-stream');
    res.setHeader('x-upstream-content-type', out.type.replace(/[^\x20-\x7e]/g, ''));
    res.end(out.body);
  } catch (e) {
    const err = e instanceof HttpError ? e : new HttpError(502, "Couldn't reach the site.");
    res.statusCode = err.status;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end(err.message);
  }
}

export function feedProxy(): Plugin {
  // Returns nothing on purpose: a function returned from these hooks would be run later as a "post" hook.
  const use = (server: { middlewares: { use: (path: string, fn: (req: IncomingMessage, res: ServerResponse) => void) => unknown } }): void => {
    server.middlewares.use('/api/fetch', (req, res) => void handle(req, res));
  };
  return {
    name: 'deca-study-feed-proxy',
    configureServer: use,
    configurePreviewServer: use,
  };
}
