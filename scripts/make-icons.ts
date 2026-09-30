/**
 * Render the installed-app icons (PNG) from the logo, public/favicon.svg (the
 * DECA diamond), on a white background, using the installed Chromium.
 *
 *   node scripts/make-icons.ts
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const logo = readFileSync('public/favicon.svg', 'utf8');

/** The logo centred on a white square, taking up `share` of its width. */
const icon = (size: number, share: number) => `
<div style="width:${size}px;height:${size}px;background:#fff;display:grid;place-items:center">
  <div style="width:${Math.round(size * share)}px">${logo.replace('<svg ', '<svg style="display:block;width:100%;height:auto" ')}</div>
</div>`;

const icons: [string, number, string][] = [
  ['public/pwa-192.png', 192, icon(192, 0.8)],
  ['public/pwa-512.png', 512, icon(512, 0.8)],
  // Some launchers crop maskable icons to a circle: keep the diamond inside the safe zone.
  ['public/pwa-maskable-512.png', 512, icon(512, 0.6)],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, html] of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0}</style>${html}`);
  await page.locator('body > div').screenshot({ path: file });
  console.log('wrote', file);
}
await browser.close();
