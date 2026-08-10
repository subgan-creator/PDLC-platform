# PDLC Platform

Enterprise Product Development Lifecycle platform for large, agile-immature organizations — banks, pharma, consumer goods. See [CLAUDE.md](CLAUDE.md) for the vision, module map, tech stack, and engineering rules, and [docs/](docs/) for architecture, data model, NFRs, integration strategy, and ADRs.

## Quickstart

```bash
pnpm install
docker compose up -d
pnpm --filter @pdlc/api prisma:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Web: http://localhost:5173 · API: http://localhost:3000 (docs at `/api/docs`) · Worker health: http://localhost:3100/health

This repository is at **Phase 0** of the build sequence in `CLAUDE.md` — foundation only (tenancy, RBAC, audit, CI, seed data). No product feature workspaces exist yet.
