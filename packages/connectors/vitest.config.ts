import { defineConfig } from 'vitest/config';

// Empty until Phase 5 (see src/index.ts) — passWithNoTests reflects that
// honestly instead of masking it with a placeholder test.
export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
});
