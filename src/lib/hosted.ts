/**
 * The phone version: built with VITE_HOSTED=1 and served from GitHub Pages,
 * so there's no local server behind it (no News, and links from sites that
 * block downloads can't be fetched).
 */
export const HOSTED = import.meta.env.VITE_HOSTED === '1';

/** A file from public/, under the address the app is served from ("/" locally, "/deca-cated/" on GitHub Pages). */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

/** A phone or tablet: a finger instead of a mouse. */
export function isTouch(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;
}
