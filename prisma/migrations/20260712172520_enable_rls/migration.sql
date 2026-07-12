-- Enable Row Level Security on every table in the `public` schema.
--
-- This app never queries these tables through Supabase's Data API
-- (PostgREST) — all reads/writes go through Prisma over a direct Postgres
-- connection as the `postgres` role, which owns these tables. Postgres
-- exempts table owners (and superusers) from RLS by default, so this is a
-- no-op for the app's own backend. What it *does* do is close the actual
-- hole Supabase's security advisor flags "RLS Disabled in Public" for:
-- without RLS, any client using the anon/authenticated key could read or
-- write these tables directly via the Data API, since Supabase grants
-- those roles table privileges by default. No policies are added because
-- these tables are not meant to be reachable via the Data API at all —
-- enabling RLS with zero policies denies all access to every role except
-- the table owner, which is exactly the intended access model here.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CostSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaterialCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaterialOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExtraOption" ENABLE ROW LEVEL SECURITY;
