// @ts-check
const base = require('@pdlc/config/eslint');

module.exports = [
  ...base,
  {
    // Enforces "every DB query goes through a tenant-scoped repository;
    // direct Prisma calls in controllers are forbidden" (CLAUDE.md).
    files: ['src/**/*.ts'],
    // health/**: Terminus's PrismaHealthIndicator needs the raw PrismaService
    // to ping the DB — a liveness/readiness check has no tenant context and
    // never touches a tenant-scoped table, so the repository pattern doesn't
    // apply here.
    ignores: ['src/**/*.repository.ts', 'src/prisma/**', 'src/audit/**', 'src/health/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '../prisma/prisma.service',
              message:
                'Inject a *.repository.ts instead of PrismaService directly outside repositories/prisma/audit.',
            },
          ],
        },
      ],
    },
  },
];
