#!/bin/sh
set -e
echo "→ Applying database migrations"
prisma migrate deploy --schema=/app/prisma/schema.prisma

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "→ Seeding researched starter content (idempotent)"
  tsx /app/prisma/seed.ts || echo "! Seed failed (continuing)"
fi

echo "→ Starting Rotaract Club Kampala North on :${PORT:-3000}"
exec "$@"
