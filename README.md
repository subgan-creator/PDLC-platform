# PDLC Platform

Enterprise Product Development Lifecycle platform for large, agile-immature organizations — banks, pharma, consumer goods. See [CLAUDE.md](CLAUDE.md) for the vision, module map, tech stack, and engineering rules, and [docs/](docs/) for architecture, data model, NFRs, integration strategy, and ADRs.

## Running it locally — the easy way

You need two things installed first (one-time, both free):

1. **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** — download, install, open it, and wait until it says it's running.
2. **[Node.js](https://nodejs.org/)** (the LTS version) — download, install, accept the defaults.

Then, in a terminal, from this folder:

```bash
pnpm setup
```

(If `pnpm` isn't found, run `corepack enable` once first — it ships with Node.)

This one command starts the database, installs everything, sets it up, fills it with sample data, and starts the app. The first run takes a few minutes; after that it's fast. Leave the terminal window open — that's what's running the app. Press `Ctrl+C` there to stop it.

Once it says the app is running, open **http://localhost:5173** in your browser. You'll land on a "Who are you?" screen — pick any seeded user and you're in. No password needed locally; use the "Switch user" link in the sidebar any time to try a different persona (e.g. see what a Designer or Engineer sees vs. a Product Manager).

## Running it locally — the manual way

If you'd rather run each step yourself (or `pnpm setup` hits something it doesn't handle):

```bash
docker compose up -d                          # Postgres, Redis, OpenSearch, LocalStack
pnpm install
pnpm --filter @pdlc/api prisma:generate
pnpm db:migrate                                # applies database schema
pnpm db:seed                                   # 2 tenants, 12 users, 60 sample initiatives
pnpm dev                                        # starts web + api + worker
```

Web: http://localhost:5173 · API: http://localhost:3000 (docs at `/api/docs`) · Worker health: http://localhost:3100/health

## What's built so far

- **Phase 0** — foundation: tenancy, RBAC, audit trail, CI, seed data.
- **Phase 1** — Initiative Workspace: create/edit initiatives, RAID log, milestones, stakeholders, status updates, comments, links, version history; a roadmap with drag-to-reprioritize Now/Next/Later swimlanes and a timeline view.

See the module map in [CLAUDE.md](CLAUDE.md) for what's next.
