/**
 * Render the PWA icons (PNG) from the SVG mark using the installed Chromium.
 *
 *   node scripts/make-icons.ts
 */
import { chromium } from '@playwright/test';

const mark = (size: number, inset: number, radius: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  ${radius ? `<rect width="64" height="64" rx="${radius}" fill="#2563eb"/>` : '<rect width="64" height="64" fill="#2563eb"/>'}
  <g transform="translate(${inset} ${inset}) scale(${(64 - 2 * inset) / 64})">
    <path d="M19 33.5l8.5 8.5L45 23.5" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

const icons: [string, number, string][] = [
  ['public/pwa-192.png', 192, mark(192, 0, 14)],
  ['public/pwa-512.png', 512, mark(512, 0, 14)],
  // Maskable icons are cropped to a circle by some launchers: full bleed, mark in the safe zone.
  ['public/pwa-maskable-512.png', 512, mark(512, 10, 0)],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, svg] of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
  await page.locator('svg').screenshot({ path: file, omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
