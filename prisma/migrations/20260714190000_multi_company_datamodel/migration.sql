-- Fase 2 (multi-company): introduceert Company + CompanyMember en verhuist
-- alle bedrijfsgebonden data (CostSettings, Branding, Service, Product, Lead)
-- en alle bedrijfs-/abonnementsvelden van User naar Company.
--
-- Migratie: elke bestaande User krijgt automatisch precies één Company
-- (zijn huidige bedrijfsnaam/slug/abonnement/onboarding-status), gekoppeld
-- via een CompanyMember-rij met rol 'owner'. Company.migratedFromUserId
-- blijft de tabel permanent zodat de Mollie-webhook oude, vóór-migratie
-- metadata (die alleen userId bevat, nooit companyId) kan terugvinden.
--
-- Idempotent: elke stap is te herhalen zonder duplicaten of fouten
-- (CREATE ... IF NOT EXISTS, backfill-INSERTs met NOT EXISTS-guard, DROP
-- ... IF EXISTS).
--
-- ROLLBACK: er is geen geautomatiseerd rollback-script. Om terug te
-- draaien vóórdat een volgende migratie hierop voortbouwt: herstel de
-- meest recente back-up van vóór deze migratie. Na deze migratie is de
-- oorspronkelijke user-gebonden vorm van de data niet meer te reconstrueren
-- uit de nieuwe tabellen alleen (userId-kolommen zijn verwijderd), dus een
-- back-up vooraf is vereist als terugdraaien ooit nodig is.

-- ============================================================
-- 1. Nieuwe tabellen
-- ============================================================

CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kvkNummer" TEXT,
    "adres" TEXT,
    "migratedFromUserId" TEXT,
    "createdBy" TEXT NOT NULL,
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'GRATIS',
    "overrideTier" "SubscriptionTier",
    "mollieCustomerId" TEXT,
    "mollieSubscriptionId" TEXT,
    "subscriptionStatus" "MollieSubscriptionStatus" NOT NULL DEFAULT 'GEEN',
    "billingInterval" "BillingInterval",
    "huidigePeriodeEind" TIMESTAMP(3),
    "onboardingPortaalBekeken" BOOLEAN NOT NULL DEFAULT false,
    "onboardingVoltooid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CompanyMember" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Company_slug_key" ON "Company"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Company_migratedFromUserId_key" ON "Company"("migratedFromUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "Company_mollieCustomerId_key" ON "Company"("mollieCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Company_mollieSubscriptionId_key" ON "Company"("mollieSubscriptionId");

CREATE INDEX IF NOT EXISTS "CompanyMember_userId_idx" ON "CompanyMember"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyMember_companyId_userId_key" ON "CompanyMember"("companyId", "userId");

ALTER TABLE "Company"
  DROP CONSTRAINT IF EXISTS "Company_createdBy_fkey",
  ADD CONSTRAINT "Company_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompanyMember"
  DROP CONSTRAINT IF EXISTS "CompanyMember_companyId_fkey",
  ADD CONSTRAINT "CompanyMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyMember"
  DROP CONSTRAINT IF EXISTS "CompanyMember_userId_fkey",
  ADD CONSTRAINT "CompanyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 2. Backfill: één Company + één CompanyMember (owner) per bestaande User
-- ============================================================

INSERT INTO "Company" (
  "id", "naam", "slug", "migratedFromUserId", "createdBy",
  "subscriptionTier", "overrideTier", "mollieCustomerId", "mollieSubscriptionId",
  "subscriptionStatus", "billingInterval", "huidigePeriodeEind",
  "onboardingPortaalBekeken", "onboardingVoltooid", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, u."bedrijfsnaam", u."slug", u."id", u."id",
  u."subscriptionTier", u."overrideTier", u."mollieCustomerId", u."mollieSubscriptionId",
  u."subscriptionStatus", u."billingInterval", u."huidigePeriodeEind",
  u."onboardingPortaalBekeken", u."onboardingVoltooid", u."createdAt", u."updatedAt"
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "Company" c WHERE c."migratedFromUserId" = u."id"
);

INSERT INTO "CompanyMember" ("id", "companyId", "userId", "rol", "createdAt")
SELECT gen_random_uuid()::text, c."id", c."migratedFromUserId", 'owner', c."createdAt"
FROM "Company" c
WHERE c."migratedFromUserId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "CompanyMember" cm
    WHERE cm."companyId" = c."id" AND cm."userId" = c."migratedFromUserId"
  );

-- ============================================================
-- 3. CostSettings, Branding, Service, Product, Lead: userId -> companyId
-- ============================================================

ALTER TABLE "CostSettings" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
UPDATE "CostSettings" cs SET "companyId" = c."id"
FROM "Company" c WHERE c."migratedFromUserId" = cs."userId" AND cs."companyId" IS NULL;
ALTER TABLE "CostSettings" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "CostSettings" DROP CONSTRAINT IF EXISTS "CostSettings_userId_fkey";
DROP INDEX IF EXISTS "CostSettings_userId_key";
ALTER TABLE "CostSettings" DROP COLUMN IF EXISTS "userId";
CREATE UNIQUE INDEX IF NOT EXISTS "CostSettings_companyId_key" ON "CostSettings"("companyId");
ALTER TABLE "CostSettings"
  DROP CONSTRAINT IF EXISTS "CostSettings_companyId_fkey",
  ADD CONSTRAINT "CostSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Branding" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
UPDATE "Branding" b SET "companyId" = c."id"
FROM "Company" c WHERE c."migratedFromUserId" = b."userId" AND b."companyId" IS NULL;
ALTER TABLE "Branding" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Branding" DROP CONSTRAINT IF EXISTS "Branding_userId_fkey";
DROP INDEX IF EXISTS "Branding_userId_key";
ALTER TABLE "Branding" DROP COLUMN IF EXISTS "userId";
CREATE UNIQUE INDEX IF NOT EXISTS "Branding_companyId_key" ON "Branding"("companyId");
ALTER TABLE "Branding"
  DROP CONSTRAINT IF EXISTS "Branding_companyId_fkey",
  ADD CONSTRAINT "Branding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
UPDATE "Service" s SET "companyId" = c."id"
FROM "Company" c WHERE c."migratedFromUserId" = s."userId" AND s."companyId" IS NULL;
ALTER TABLE "Service" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_userId_fkey";
DROP INDEX IF EXISTS "Service_userId_idx";
ALTER TABLE "Service" DROP COLUMN IF EXISTS "userId";
CREATE INDEX IF NOT EXISTS "Service_companyId_idx" ON "Service"("companyId");
ALTER TABLE "Service"
  DROP CONSTRAINT IF EXISTS "Service_companyId_fkey",
  ADD CONSTRAINT "Service_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
UPDATE "Product" p SET "companyId" = c."id"
FROM "Company" c WHERE c."migratedFromUserId" = p."userId" AND p."companyId" IS NULL;
ALTER TABLE "Product" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_userId_fkey";
DROP INDEX IF EXISTS "Product_userId_idx";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "userId";
CREATE INDEX IF NOT EXISTS "Product_companyId_idx" ON "Product"("companyId");
ALTER TABLE "Product"
  DROP CONSTRAINT IF EXISTS "Product_companyId_fkey",
  ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
UPDATE "Lead" l SET "companyId" = c."id"
FROM "Company" c WHERE c."migratedFromUserId" = l."userId" AND l."companyId" IS NULL;
ALTER TABLE "Lead" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_userId_fkey";
DROP INDEX IF EXISTS "Lead_userId_status_idx";
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "userId";
CREATE INDEX IF NOT EXISTS "Lead_companyId_status_idx" ON "Lead"("companyId", "status");
ALTER TABLE "Lead"
  DROP CONSTRAINT IF EXISTS "Lead_companyId_fkey",
  ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 4. User: verwijder bedrijfs-/abonnementsvelden (nu op Company)
-- ============================================================

DROP INDEX IF EXISTS "User_slug_key";
DROP INDEX IF EXISTS "User_mollieCustomerId_key";
DROP INDEX IF EXISTS "User_mollieSubscriptionId_key";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "bedrijfsnaam",
  DROP COLUMN IF EXISTS "slug",
  DROP COLUMN IF EXISTS "subscriptionTier",
  DROP COLUMN IF EXISTS "overrideTier",
  DROP COLUMN IF EXISTS "mollieCustomerId",
  DROP COLUMN IF EXISTS "mollieSubscriptionId",
  DROP COLUMN IF EXISTS "subscriptionStatus",
  DROP COLUMN IF EXISTS "billingInterval",
  DROP COLUMN IF EXISTS "huidigePeriodeEind",
  DROP COLUMN IF EXISTS "onboardingPortaalBekeken",
  DROP COLUMN IF EXISTS "onboardingVoltooid";

-- ============================================================
-- 5. RLS: zelfde "closed by default, geen policies"-conventie als de
-- overige tabellen (zie migratie 20260712172520_enable_rls) — deze tabellen
-- zijn, net als de rest, uitsluitend bereikbaar via Prisma over de directe
-- Postgres-verbinding, nooit via Supabase's Data API.
-- ============================================================

ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompanyMember" ENABLE ROW LEVEL SECURITY;
