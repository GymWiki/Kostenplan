-- Branding, Lead en LeadNote zijn na de oorspronkelijke enable_rls-migratie
-- (20260712172520) toegevoegd en misten daardoor RLS — vandaar de "RLS
-- Disabled in Public"-waarschuwingen in Supabase's advisors. Zelfde
-- rationale als die migratie: de app benadert deze tabellen uitsluitend via
-- Prisma over een directe verbinding als de `postgres`-rol (tabelowner, dus
-- vrijgesteld van RLS), niet via Supabase's Data API. RLS zonder policies
-- weigert alle toegang voor anon/authenticated, precies het gewenste model
-- aangezien deze tabellen nooit via de Data API bereikbaar hoeven te zijn.
ALTER TABLE "Branding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeadNote" ENABLE ROW LEVEL SECURITY;
