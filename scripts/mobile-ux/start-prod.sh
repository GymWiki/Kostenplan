#!/bin/bash
# Bouwt en start de app tegen de lokale Postgres + nep-Supabase (poort 3200).
cd /home/user/Kostenplan
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=x DATABASE_URL=postgresql://postgres@127.0.0.1:5433/kp
fuser -k 3200/tcp 2>/dev/null; sleep 1
rm -rf .next && npx next build > /tmp/mobile-build.log 2>&1 || { tail -30 /tmp/mobile-build.log; exit 1; }
nohup npx next start -p 3200 > /tmp/mobile-app.log 2>&1 &
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3200/login && break; sleep 1; done
echo gestart
