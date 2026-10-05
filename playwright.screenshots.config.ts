import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config.ts';

// README screenshots (`pnpm docs:screenshots`): same production build and seeded
// emulators as the E2E tests, Chromium only, one worker for stable output.
export default defineConfig({
  ...baseConfig,
  testDir: './scripts/screenshots',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  projects: [{ name: 'chromium' }],
});
