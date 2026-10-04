#!/bin/sh
set -e
echo "→ Applying database migrations"
prisma migrate deploy --schema=/app/prisma/schema.prisma

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "→ Seeding researched starter content (idempotent)"
  tsx /app/prisma/seed.ts || echo "! Seed failed (continuing)"
fi

if [ "${X_IMPORT_ON_START:-true}" = "true" ]; then
  echo "→ Importing curated posts & photos from the club's X account (idempotent)"
  tsx /app/prisma/seed-x.ts || echo "! X import failed (continuing)"
fi

echo "→ Starting Rotaract Club Kampala North on :${PORT:-3000}"
exec "$@"
