#!/usr/bin/env bash
# One-command local setup + start, for anyone who doesn't want to run each
# step by hand. Requires Docker Desktop (running) and Node.js already
# installed — see README.md for the two things you need before this.
#
# Usage:  pnpm setup   (or: bash scripts/setup-local.sh)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "==> Checking Docker is running..."
if ! docker info >/dev/null 2>&1; then
  echo ""
  echo "Docker doesn't seem to be running."
  echo "Open the Docker Desktop app, wait until it says it's running, then run this again."
  exit 1
fi

echo "==> Starting Postgres, Redis, OpenSearch, LocalStack (docker compose up -d)..."
docker compose up -d

echo "==> Waiting for the database to be ready..."
tries=0
until docker compose exec -T postgres pg_isready -U pdlc >/dev/null 2>&1; do
  tries=$((tries + 1))
  if [ "$tries" -gt 60 ]; then
    echo "Postgres didn't become ready after 60s. Run 'docker compose logs postgres' to see what's wrong."
    exit 1
  fi
  sleep 1
done

echo "==> Installing dependencies (first run can take a few minutes)..."
pnpm install

echo "==> Setting up .env files (only if missing, so this never overwrites your edits)..."
for app in api worker web; do
  if [ -f "apps/$app/.env.example" ] && [ ! -f "apps/$app/.env" ]; then
    cp "apps/$app/.env.example" "apps/$app/.env"
    echo "   created apps/$app/.env"
  fi
done

echo "==> Generating the database client..."
pnpm --filter @pdlc/api prisma:generate

echo "==> Applying database migrations..."
pnpm --filter @pdlc/api prisma:migrate:deploy

echo "==> Seeding sample data (2 tenants, 12 users, 60 initiatives)..."
pnpm db:seed

echo ""
echo "==> All set. Starting the app — this will keep running until you press Ctrl+C."
echo "    Once you see it come up, open http://localhost:5173"
echo ""
pnpm dev
