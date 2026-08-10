import { defineConfig } from 'vitest/config';

// This package is intentionally type-only (see src/index.ts) — no runtime
// logic to unit test. `tsc --noEmit` (the `typecheck` script) is the real
// verification here; `passWithNoTests` keeps `test` green for the same
// reason rather than papering over it with a placeholder test.
export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
});
