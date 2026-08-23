import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vitest's default transform is esbuild, which — like tsx (see
  // apps/api/tsconfig.json's comment on why `dev` uses ts-node instead) —
  // does NOT emit TypeScript decorator metadata. Every repository here
  // relies on that metadata for NestJS to resolve untyped constructor
  // params (PrismaService, OutboxService, ...): under plain esbuild they
  // silently resolve to `undefined` instead of throwing, so every request
  // 500s with no useful stack trace. unplugin-swc transforms via the real
  // SWC compiler with decoratorMetadata on, which is NestJS's own
  // documented fix for this exact vitest integration problem. Confirmed
  // broken without this (`repo.prisma: undefined`) while adding the
  // Discovery Hub e2e spec — the first e2e test to ever exercise a real
  // injected repository; health.e2e-spec.ts's /health route doesn't.
  plugins: [
    swc.vite({
      jsc: { transform: { legacyDecorator: true, decoratorMetadata: true } },
    }),
  ],
  test: {
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 30_000,
  },
});
