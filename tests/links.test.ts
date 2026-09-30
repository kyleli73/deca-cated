import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadPdf, fileNameFromLink, linksIn } from '../src/lib/links.ts';
import { guessMeta } from '../src/pages/ImportPage.tsx';

const CDN = 'https://cdn.example.com/614e10e1200f163424ddb67c';
const PDF = new TextEncoder().encode('%PDF-1.7\n…');

afterEach(() => vi.unstubAllGlobals());

describe('import from links', () => {
  it('finds each link in pasted text, once', () => {
    const text = `* ${CDN}/a.pdf\n* ${CDN}/b.pdf\n\n${CDN}/a.pdf  and some words`;
    expect(linksIn(text)).toEqual([`${CDN}/a.pdf`, `${CDN}/b.pdf`]);
    expect(linksIn('no links here')).toEqual([]);
  });

  it('names the file after the link, without a storage id that could pass for a year', () => {
    const name = fileNameFromLink(`${CDN}/616dbd6259ef8bd23c296877_HS_Finance_Cluster_Sample_Exam_21.pdf`);
    expect(name).toBe('HS_Finance_Cluster_Sample_Exam_21.pdf');
    expect(fileNameFromLink(`${CDN}/2024%20Finance%20District.pdf`)).toBe('2024 Finance District.pdf');
    expect(fileNameFromLink('https://example.com/')).toBe('');
    expect(guessMeta(fileNameFromLink(`${CDN}/6886e64343b685091de31875_C25_HS_FIN_exam.pdf`)).year).toBeUndefined();
  });

  it('downloads directly when the site allows it', async () => {
    const fetch = vi.fn(async () => new Response(PDF));
    vi.stubGlobal('fetch', fetch);
    expect(new Uint8Array(await downloadPdf(`${CDN}/a.pdf`))).toEqual(PDF);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("goes through the app's local server when the site blocks direct downloads", async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.startsWith('/api/fetch?url=')) return new Response(PDF);
      throw new TypeError('Failed to fetch'); // what a CORS block looks like
    });
    vi.stubGlobal('fetch', fetch);
    expect(new Uint8Array(await downloadPdf(`${CDN}/a.pdf`))).toEqual(PDF);
    expect(fetch).toHaveBeenLastCalledWith(`/api/fetch?url=${encodeURIComponent(`${CDN}/a.pdf`)}`, { cache: 'no-store' });
  });

  it('explains a bad link, a page that is not a PDF, and a missing local server', async () => {
    vi.stubGlobal('fetch', async () => new Response('Not found', { status: 404 }));
    await expect(downloadPdf(`${CDN}/gone.pdf`)).rejects.toThrow('cdn.example.com answered 404. Check the link.');

    vi.stubGlobal('fetch', async () => new Response('<!doctype html><title>DECA</title>'));
    await expect(downloadPdf(`${CDN}/page`)).rejects.toThrow("That link isn't a PDF.");

    vi.stubGlobal('fetch', async (url: string) => {
      if (url.startsWith('/api/fetch')) return new Response('', { status: 404 });
      throw new TypeError('Failed to fetch');
    });
    await expect(downloadPdf(`${CDN}/a.pdf`)).rejects.toThrow("the app's local server isn't running");
  });
});
