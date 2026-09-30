/** Web addresses in pasted text (one per line, or separated by spaces), duplicates dropped. */
export function linksIn(text: string): string[] {
  return [...new Set(text.match(/https?:\/\/[^\s<>"']+/gi) ?? [])];
}

/**
 * "HS_Finance_Cluster_Sample_Exam_2017.pdf" from a link, without the storage
 * id some sites put in front ("616dbd55aafdb9dfeefc4f9e_…"), which could
 * otherwise be read as a year.
 */
export function fileNameFromLink(link: string): string {
  let name = '';
  try {
    name = decodeURIComponent(new URL(link).pathname.split('/').pop() ?? '');
  } catch {
    // not a valid address: no name
  }
  return name.replace(/^[0-9a-f]{16,}_/i, '');
}

function isPdf(data: ArrayBuffer): boolean {
  return new TextDecoder('latin1').decode(data.slice(0, 1024)).includes('%PDF-');
}

/** Through the app's local server (the one the News page uses), for sites that don't allow direct downloads. */
async function viaLocalServer(link: string): Promise<ArrayBuffer> {
  let res: Response;
  try {
    res = await fetch(`/api/fetch?url=${encodeURIComponent(link)}`, { cache: 'no-store' });
  } catch {
    throw new Error("Couldn't download it. Check the link and your internet connection.");
  }
  if (res.status === 404) {
    throw new Error("This site doesn't allow direct downloads, and the app's local server isn't running. Start it with npm run app, or download the PDF and drop it in.");
  }
  if (!res.ok) throw new Error((await res.text()) || `Error ${res.status}.`);
  return res.arrayBuffer();
}

/** Download an exam PDF from a link. */
export async function downloadPdf(link: string): Promise<ArrayBuffer> {
  let res: Response | null = null;
  try {
    res = await fetch(link, { cache: 'no-store' });
  } catch {
    // Blocked by the site (CORS) or offline: the local server tries next.
  }
  if (res && !res.ok) throw new Error(`${new URL(link).hostname} answered ${res.status}. Check the link.`);
  const data = res ? await res.arrayBuffer() : await viaLocalServer(link);
  if (!isPdf(data)) throw new Error("That link isn't a PDF. Use the link that opens the exam PDF itself.");
  return data;
}
