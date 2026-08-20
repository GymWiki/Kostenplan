-- Levering A (multi-tool-architectuur): introduceert Tool als de centrale
-- calculator-eenheid tussen Company en Branding/CostSettings/Product/Lead.
-- Vóór deze migratie had elke Company precies één impliciete "calculator"
-- (haar eigen Branding/CostSettings/Producten); vanaf nu kan een Company
-- meerdere onafhankelijke Tools hebben, en verhuizen Branding, CostSettings
-- en Product van companyId naar toolId. Lead behoudt companyId (denormalized,
-- voor company-brede CRM-query's) én krijgt toolId + toolNaamSnapshot erbij.
--
-- Migratie: elke bestaande Company krijgt automatisch precies één Tool,
-- vernoemd naar de company zelf, met slug 'rekentool' en status
-- GEPUBLICEERD — dat laatste is essentieel: vóór deze migratie was elke
-- company met Branding/CostSettings/producten impliciet "live" op
-- /portaal/[slug], dus de gemigreerde Tool moet meteen ook publiek
-- bereikbaar zijn, anders breekt elke bestaande klant-link op het moment
-- van migreren. Alle bestaande Branding/CostSettings/Product/Lead-rijen
-- worden gekoppeld aan die ene Tool van hun company.
--
-- BELANGRIJK — volgorde van uitrollen: deze migratie MOET zijn uitgevoerd
-- (en geverifieerd, zie de RAISE EXCEPTION-checks hieronder) vóórdat de
-- applicatiecode van deze branch wordt gedeployed. De nieuwe Prisma Client
-- selecteert overal toolId (en voor Lead ook toolNaamSnapshot) — zonder
-- deze kolommen in de database breekt elke query op Branding/CostSettings/
-- Product/Lead onmiddellijk in productie (zelfde faalpatroon als eerder bij
-- Lead.externAfgehandeldOp). Deze migratie is de enige juiste volgorde:
-- eerst de database, dan pas de nieuwe code.
--
-- Idempotent: elke stap is te herhalen zonder duplicaten of fouten
-- (ADD COLUMN/CREATE ... IF NOT EXISTS, backfills met een NULL/NOT EXISTS-
-- guard, DROP ... IF EXISTS). Veilig om per ongeluk twee keer te draaien.
--
-- ROLLBACK: geen geautomatiseerd rollback-script. Terugdraaien vóórdat een
-- volgende migratie hierop voortbouwt: herstel de meest recente back-up van
-- vóór deze migratie — na deze migratie is companyId op Branding/
-- CostSettings/Product niet meer te reconstrueren uit toolId alleen zonder
-- die back-up (de kolom wordt hieronder verwijderd).

-- ============================================================
-- 1. Nieuwe enums
-- ============================================================

CREATE TYPE "ToolStatus" AS ENUM ('CONCEPT', 'GEPUBLICEERD', 'GEPAUZEERD');
CREATE TYPE "ToolPrijsWeergave" AS ENUM ('EXACT', 'VANAF', 'RANGE', 'GEEN');
CREATE TYPE "ToolPrijsAfronding" AS ENUM ('GEEN', 'HEEL_EURO', 'VIJF_EURO', 'TIEN_EURO');
CREATE TYPE "ToolCtaType" AS ENUM ('OFFERTE_AANVRAGEN', 'AANVRAAG_VERSTUREN', 'CONTACT_OPNEMEN', 'BEL_MIJ', 'WHATSAPP', 'AFSPRAAK_MAKEN');
CREATE TYPE "AnalyticsEventType" AS ENUM ('VISIT', 'START', 'COMPLETE', 'LEAD');

-- ============================================================
-- 2. Company: account-defaults voor uurtarief/voorrijkosten/btw
-- ============================================================

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "standaardArbeidTariefUur" DOUBLE PRECISION NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS "standaardVoorrijTarief" DOUBLE PRECISION NOT NULL DEFAULT 35,
  ADD COLUMN IF NOT EXISTS "standaardBtwPercentage" DOUBLE PRECISION NOT NULL DEFAULT 21;

-- ============================================================
-- 3. Nieuwe tabellen: Tool, AnalyticsEvent
-- ============================================================

CREATE TABLE IF NOT EXISTS "Tool" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ToolStatus" NOT NULL DEFAULT 'CONCEPT',
    "icoon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "resultaatConfig" JSONB NOT NULL DEFAULT '{}',
    "leadFormConfig" JSONB NOT NULL DEFAULT '{}',
    "embedConfig" JSONB NOT NULL DEFAULT '{}',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tool_companyId_slug_key" ON "Tool"("companyId", "slug");
CREATE INDEX IF NOT EXISTS "Tool_companyId_idx" ON "Tool"("companyId");

ALTER TABLE "Tool"
  DROP CONSTRAINT IF EXISTS "Tool_companyId_fkey",
  ADD CONSTRAINT "Tool_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_toolId_type_createdAt_idx" ON "AnalyticsEvent"("toolId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_companyId_createdAt_idx" ON "AnalyticsEvent"("companyId", "createdAt");

ALTER TABLE "AnalyticsEvent"
  DROP CONSTRAINT IF EXISTS "AnalyticsEvent_companyId_fkey",
  ADD CONSTRAINT "AnalyticsEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent"
  DROP CONSTRAINT IF EXISTS "AnalyticsEvent_toolId_fkey",
  ADD CONSTRAINT "AnalyticsEvent_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zelfde "closed by default, geen policies"-conventie als alle andere
-- tabellen (zie 20260712172520_enable_rls) — uitsluitend bereikbaar via
-- Prisma over de directe Postgres-verbinding, nooit via Supabase's Data API.
ALTER TABLE "Tool" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnalyticsEvent" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Backfill: precies één Tool per bestaande Company
-- ============================================================
-- Naam = de bedrijfsnaam zelf (de vakman kan 'm hierna altijd hernoemen via
-- Instellingen), slug = 'rekentool' (uniek genoeg binnen één company), en
-- essentieel: status GEPUBLICEERD — vóór deze migratie was elke company met
-- Branding/CostSettings/producten impliciet live op /portaal/[slug].

INSERT INTO "Tool" (
  "id", "companyId", "naam", "slug", "status", "order",
  "resultaatConfig", "leadFormConfig", "embedConfig",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, c."id", c."naam", 'rekentool', 'GEPUBLICEERD', 0,
  '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
  c."createdAt", CURRENT_TIMESTAMP
FROM "Company" c
WHERE NOT EXISTS (
  SELECT 1 FROM "Tool" t WHERE t."companyId" = c."id"
);

DO $$
DECLARE
  companies_zonder_tool INTEGER;
BEGIN
  SELECT COUNT(*) INTO companies_zonder_tool
  FROM "Company" c
  WHERE NOT EXISTS (SELECT 1 FROM "Tool" t WHERE t."companyId" = c."id");

  IF companies_zonder_tool > 0 THEN
    RAISE EXCEPTION 'Backfill-fout: % company(s) hebben nog geen Tool na de backfill', companies_zonder_tool;
  END IF;
END $$;

-- ============================================================
-- 5. CostSettings: nieuwe account-defaults-vlaggen (additief, veilig)
-- ============================================================

ALTER TABLE "CostSettings"
  ADD COLUMN IF NOT EXISTS "gebruiktAccountArbeidTarief" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "gebruiktAccountVoorrijTarief" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "gebruiktAccountBtw" BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 6. Branding: companyId -> toolId (1-op-1 met Tool)
-- ============================================================

ALTER TABLE "Branding" ADD COLUMN IF NOT EXISTS "toolId" TEXT;
UPDATE "Branding" b SET "toolId" = (
  SELECT t."id" FROM "Tool" t WHERE t."companyId" = b."companyId" ORDER BY t."createdAt" ASC LIMIT 1
) WHERE b."toolId" IS NULL;

DO $$
DECLARE
  branding_zonder_tool INTEGER;
BEGIN
  SELECT COUNT(*) INTO branding_zonder_tool FROM "Branding" WHERE "toolId" IS NULL;
  IF branding_zonder_tool > 0 THEN
    RAISE EXCEPTION 'Backfill-fout: % Branding-rij(en) hebben geen toolId gekregen', branding_zonder_tool;
  END IF;
END $$;

ALTER TABLE "Branding" ALTER COLUMN "toolId" SET NOT NULL;
ALTER TABLE "Branding" DROP CONSTRAINT IF EXISTS "Branding_companyId_fkey";
DROP INDEX IF EXISTS "Branding_companyId_key";
ALTER TABLE "Branding" DROP COLUMN IF EXISTS "companyId";
CREATE UNIQUE INDEX IF NOT EXISTS "Branding_toolId_key" ON "Branding"("toolId");
ALTER TABLE "Branding"
  DROP CONSTRAINT IF EXISTS "Branding_toolId_fkey",
  ADD CONSTRAINT "Branding_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 7. CostSettings: companyId -> toolId (1-op-1 met Tool)
-- ============================================================

ALTER TABLE "CostSettings" ADD COLUMN IF NOT EXISTS "toolId" TEXT;
UPDATE "CostSettings" cs SET "toolId" = (
  SELECT t."id" FROM "Tool" t WHERE t."companyId" = cs."companyId" ORDER BY t."createdAt" ASC LIMIT 1
) WHERE cs."toolId" IS NULL;

DO $$
DECLARE
  costsettings_zonder_tool INTEGER;
BEGIN
  SELECT COUNT(*) INTO costsettings_zonder_tool FROM "CostSettings" WHERE "toolId" IS NULL;
  IF costsettings_zonder_tool > 0 THEN
    RAISE EXCEPTION 'Backfill-fout: % CostSettings-rij(en) hebben geen toolId gekregen', costsettings_zonder_tool;
  END IF;
END $$;

ALTER TABLE "CostSettings" ALTER COLUMN "toolId" SET NOT NULL;
ALTER TABLE "CostSettings" DROP CONSTRAINT IF EXISTS "CostSettings_companyId_fkey";
DROP INDEX IF EXISTS "CostSettings_companyId_key";
ALTER TABLE "CostSettings" DROP COLUMN IF EXISTS "companyId";
CREATE UNIQUE INDEX IF NOT EXISTS "CostSettings_toolId_key" ON "CostSettings"("toolId");
ALTER TABLE "CostSettings"
  DROP CONSTRAINT IF EXISTS "CostSettings_toolId_fkey",
  ADD CONSTRAINT "CostSettings_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 8. Product: companyId -> toolId
-- ============================================================

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "toolId" TEXT;
UPDATE "Product" p SET "toolId" = (
  SELECT t."id" FROM "Tool" t WHERE t."companyId" = p."companyId" ORDER BY t."createdAt" ASC LIMIT 1
) WHERE p."toolId" IS NULL;

DO $$
DECLARE
  producten_zonder_tool INTEGER;
BEGIN
  SELECT COUNT(*) INTO producten_zonder_tool FROM "Product" WHERE "toolId" IS NULL;
  IF producten_zonder_tool > 0 THEN
    RAISE EXCEPTION 'Backfill-fout: % Product-rij(en) hebben geen toolId gekregen', producten_zonder_tool;
  END IF;
END $$;

ALTER TABLE "Product" ALTER COLUMN "toolId" SET NOT NULL;
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_companyId_fkey";
DROP INDEX IF EXISTS "Product_companyId_idx";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "companyId";
CREATE INDEX IF NOT EXISTS "Product_toolId_idx" ON "Product"("toolId");
ALTER TABLE "Product"
  DROP CONSTRAINT IF EXISTS "Product_toolId_fkey",
  ADD CONSTRAINT "Product_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 9. Lead: + toolId, + toolNaamSnapshot (companyId blijft, denormalized)
-- ============================================================

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "toolId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "toolNaamSnapshot" TEXT;

UPDATE "Lead" l SET
  "toolId" = t."id",
  "toolNaamSnapshot" = t."naam"
FROM "Tool" t
WHERE t."companyId" = l."companyId"
  AND l."toolId" IS NULL
  AND t."id" = (
    SELECT t2."id" FROM "Tool" t2 WHERE t2."companyId" = l."companyId" ORDER BY t2."createdAt" ASC LIMIT 1
  );

DO $$
DECLARE
  leads_zonder_tool INTEGER;
BEGIN
  SELECT COUNT(*) INTO leads_zonder_tool
  FROM "Lead" WHERE "toolId" IS NULL OR "toolNaamSnapshot" IS NULL;
  IF leads_zonder_tool > 0 THEN
    RAISE EXCEPTION 'Backfill-fout: % Lead-rij(en) hebben geen toolId/toolNaamSnapshot gekregen', leads_zonder_tool;
  END IF;
END $$;

ALTER TABLE "Lead" ALTER COLUMN "toolId" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "toolNaamSnapshot" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "Lead_toolId_status_idx" ON "Lead"("toolId", "status");
ALTER TABLE "Lead"
  DROP CONSTRAINT IF EXISTS "Lead_toolId_fkey",
  ADD CONSTRAINT "Lead_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 10. Eindverificatie: orphan-check over alle vier de tabellen
-- ============================================================
-- Puur een dubbele, expliciete controle bovenop de FK-constraints hierboven
-- (die zelf ook al zouden falen bij een verwijzing naar een niet-bestaande
-- Tool) — geeft een duidelijkere foutmelding dan een kale FK-violation.

DO $$
DECLARE
  orphans INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphans FROM "Branding" b WHERE NOT EXISTS (SELECT 1 FROM "Tool" t WHERE t."id" = b."toolId");
  IF orphans > 0 THEN RAISE EXCEPTION 'Verificatiefout: % Branding-rij(en) verwijzen naar een niet-bestaande Tool', orphans; END IF;

  SELECT COUNT(*) INTO orphans FROM "CostSettings" cs WHERE NOT EXISTS (SELECT 1 FROM "Tool" t WHERE t."id" = cs."toolId");
  IF orphans > 0 THEN RAISE EXCEPTION 'Verificatiefout: % CostSettings-rij(en) verwijzen naar een niet-bestaande Tool', orphans; END IF;

  SELECT COUNT(*) INTO orphans FROM "Product" p WHERE NOT EXISTS (SELECT 1 FROM "Tool" t WHERE t."id" = p."toolId");
  IF orphans > 0 THEN RAISE EXCEPTION 'Verificatiefout: % Product-rij(en) verwijzen naar een niet-bestaande Tool', orphans; END IF;

  SELECT COUNT(*) INTO orphans FROM "Lead" l WHERE NOT EXISTS (SELECT 1 FROM "Tool" t WHERE t."id" = l."toolId");
  IF orphans > 0 THEN RAISE EXCEPTION 'Verificatiefout: % Lead-rij(en) verwijzen naar een niet-bestaande Tool', orphans; END IF;
END $$;
