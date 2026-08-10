import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// vitest.config.ts runs with `globals: false`, so Testing Library's own
// auto-cleanup (which only registers when it finds a *global* `afterEach`)
// never fires on its own — without this, each test's rendered DOM piles up
// in the same jsdom `document`, and later tests in the same file start
// matching elements left over from earlier ones.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement scrollIntoView; Radix's Select positions its
// viewport using it on open. A no-op is fine — we're testing behavior, not
// scroll position.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// React 18 needs this flag to wrap Radix's internal effects (e.g. Toast's
// announce portal) in act() automatically; without it the tests still pass
// but log "not configured to support act()" warnings.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
