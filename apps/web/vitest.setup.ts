import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Same reasoning as packages/ui/vitest.setup.ts — this project also runs
// with `globals: false`.
afterEach(() => {
  cleanup();
});
