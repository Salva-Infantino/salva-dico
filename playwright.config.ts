import { defineConfig, devices } from '@playwright/test';

const PORT = '4173';
const isCI = Boolean(process.env.CI);

// E2E tests run against a production build (`vite preview`), so the service worker,
// precaching and the CSP behave as they do once deployed. The build uses the emulator
// mode: `pnpm test:e2e` starts the Firebase emulators and seeds them first.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 9'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 16'] } },
  ],
  webServer: {
    command: `pnpm exec vite build --mode emulator && pnpm exec vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Never reuse a server: it could be serving a non-emulator build.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
