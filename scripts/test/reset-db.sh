#!/bin/bash
# Maakt de lokale testdatabase leeg, voert de migraties uit en zet de testdata erin. Nooit op productie.
set -e
cd "$(dirname "$0")/../.."
export DATABASE_URL=${DATABASE_URL:-postgresql://postgres@127.0.0.1:5433/kp}
export DIRECT_URL=$DATABASE_URL
case "$DATABASE_URL" in *127.0.0.1*|*localhost*) ;; *) echo "Weigert: DATABASE_URL is niet lokaal." >&2; exit 1;; esac
PGOPTIONS='-c client_min_messages=warning' psql "$DATABASE_URL" -q -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;' >/dev/null
npx prisma migrate deploy >/dev/null
npx tsx --conditions=react-server scripts/test/seed-test.ts
