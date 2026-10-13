import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  projects: [
    { name: 'app', testMatch: /(app|news|calculator|confidence|blooket)\.spec\.ts/, use: { baseURL: 'http://localhost:5173' } },
    // The installable build, served the way `npm run app` serves it.
    { name: 'offline', testMatch: /offline\.spec\.ts/, use: { baseURL: 'http://localhost:4174' } },
    // The phone version, built the way GitHub Pages builds it, on a phone-sized touch screen.
    { name: 'phone', testMatch: /phone\.spec\.ts/, use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4175/deca-cated/' } },
  ],
  webServer: [
    { command: 'npx vite --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true },
    {
      command: 'npx vite build && npx vite preview --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npx vite build --outDir dist-pages && npx vite preview --outDir dist-pages --port 4175 --strictPort',
      url: 'http://localhost:4175/deca-cated/',
      env: { BASE_PATH: '/deca-cated/', VITE_HOSTED: '1' },
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
