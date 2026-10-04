import { defineConfig } from 'vitest/config';

// Tests that need the Firestore emulator. Run them with `pnpm test:emulator`,
// which starts the emulator, runs this config and stops it.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/emulator/**/*.test.ts'],
    // Each file shares one emulator: run files one after the other.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
