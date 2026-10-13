#!/bin/bash
# Start de volledige testomgeving lokaal: Postgres (5433), nep-Supabase (54321), nep-PDOK (3299) en de app (3200) met testdata.
# Gebruik:  bash scripts/test/start-env.sh [--zonder-build]   Nooit op productie; de database moet lokaal zijn.
# (supabase start / Docker is in deze sandbox niet beschikbaar; de nep-Supabase bootst auth en opslag na.)
cd "$(dirname "$0")/../.."
export DATABASE_URL=postgresql://postgres@127.0.0.1:5433/kp DIRECT_URL=postgresql://postgres@127.0.0.1:5433/kp
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=x
export PDOK_BASIS_URL=http://127.0.0.1:3299 OFFERTE_VOORBEELDEN=1 TEST_PAGES=1 CHROMIUM_PATH=${CHROMIUM_PATH:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}
export MOLLIE_API_KEY=test_dummydummydummydummydummydummy
if ! pg_isready -h 127.0.0.1 -p 5433 >/dev/null 2>&1; then
  rm -f /tmp/pgdata/postmaster.pid
  su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgdata -o '-p 5433 -k /tmp' -l /tmp/pg.log start" >/dev/null
  sleep 2
fi
fuser -k 54321/tcp 3299/tcp 3200/tcp 2>/dev/null; sleep 1
bash scripts/test/reset-db.sh || exit 1
nohup node scripts/test/fake-supabase.js > /tmp/test-fake-supabase.log 2>&1 &
nohup node scripts/mobile-ux/fake-pdok.js > /tmp/test-fake-pdok.log 2>&1 &
if [ "$1" != "--zonder-build" ]; then
  rm -rf .next && npx next build > /tmp/test-build.log 2>&1 || { tail -30 /tmp/test-build.log; exit 1; }
fi
nohup npx next start -p 3200 > /tmp/test-app.log 2>&1 &
for i in $(seq 1 40); do curl -s -o /dev/null http://localhost:3200/login && break; sleep 1; done
echo "testomgeving gestart: http://localhost:3200 (testdata: test-results/seed.json)"
