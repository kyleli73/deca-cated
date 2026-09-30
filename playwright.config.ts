import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  projects: [
    { name: 'app', testMatch: /(app|news)\.spec\.ts/, use: { baseURL: 'http://localhost:5173' } },
    // The installable build, served the way `npm run app` serves it.
    { name: 'offline', testMatch: /offline\.spec\.ts/, use: { baseURL: 'http://localhost:4174' } },
  ],
  webServer: [
    { command: 'npx vite --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true },
    {
      command: 'npx vite build && npx vite preview --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
