import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // See vitest.e2e.config.ts's comment — same decorator-metadata fix,
  // applied here too so a future unit test that boots a real NestJS
  // TestingModule (today's two specs don't) doesn't hit the same silent
  // `undefined`-dependency landmine.
  plugins: [
    swc.vite({
      jsc: { transform: { legacyDecorator: true, decoratorMetadata: true } },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
