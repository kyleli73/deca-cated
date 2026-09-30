import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { itemsToLines, type TextItemLike } from './pdfLines.ts';

/** Extract the text of a PDF as lines per page (browser only). */
export async function pdfToPages(data: ArrayBuffer): Promise<string[][]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  const doc = await task.promise;
  const pages: string[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: TextItemLike[] = content.items.filter((it) => 'str' in it);
    pages.push(itemsToLines(items));
  }
  await task.destroy();
  return pages;
}
