-- Levering B (generieke calculator-engine): introduceert CalculatorConfig,
-- de tool-eigen, versioneerbare configuratie (velden/regels/stappen/
-- resultaatinstellingen) die de nieuwe engine interpreteert — zie
-- app/lib/calculator-engine/types.ts voor de vorm van CalculatorConfig.config.
--
-- Volledig additief, in tegenstelling tot de Levering A-migraties: een
-- nieuwe tabel plus twee NULLABLE kolommen op bestaande tabellen (Tool,
-- Lead). Geen backfill nodig — een bestaande Tool heeft standaard geen
-- CalculatorConfig (Tool.activeCalculatorConfigId blijft NULL) en blijft
-- daardoor ongewijzigd via het bestaande, sjabloon-gedreven Product/
-- CostSettings-pad draaien (zie Deel 20/31 van de opdracht: gefaseerde
-- migratie, geen breaking change). Een Tool "stapt over" op de engine pas
-- zodra er expliciet een CalculatorConfig voor wordt gepubliceerd.
--
-- Idempotent: CREATE TABLE/INDEX met IF NOT EXISTS, ADD COLUMN met IF NOT
-- EXISTS, FK's met DROP CONSTRAINT IF EXISTS vooraf — veilig om per ongeluk
-- twee keer te draaien. Zelfde volgorde-eis als bij elke eerdere migratie in
-- deze historie: dit moet tegen productie draaien vóórdat de code van deze
-- branch wordt gedeployed (de nieuwe Prisma Client kent deze kolommen/tabel
-- al), al is de blast radius hier veel kleiner dan bij Levering A — puur
-- nieuwe, optionele velden, geen enkele bestaande query breekt zonder deze
-- migratie, hooguit zou de calculator-engine zelf nog niet kunnen werken.

CREATE TYPE "CalculatorConfigStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE IF NOT EXISTS "CalculatorConfig" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "CalculatorConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "config" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculatorConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CalculatorConfig_toolId_status_idx" ON "CalculatorConfig"("toolId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "CalculatorConfig_toolId_version_key" ON "CalculatorConfig"("toolId", "version");

ALTER TABLE "CalculatorConfig"
  DROP CONSTRAINT IF EXISTS "CalculatorConfig_toolId_fkey",
  ADD CONSTRAINT "CalculatorConfig_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zelfde "closed by default, geen policies"-conventie als elke andere
-- tabel (zie 20260712172520_enable_rls) — uitsluitend bereikbaar via Prisma
-- over de directe Postgres-verbinding, nooit via Supabase's Data API.
ALTER TABLE "CalculatorConfig" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Tool" ADD COLUMN IF NOT EXISTS "activeCalculatorConfigId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Tool_activeCalculatorConfigId_key" ON "Tool"("activeCalculatorConfigId");
ALTER TABLE "Tool"
  DROP CONSTRAINT IF EXISTS "Tool_activeCalculatorConfigId_fkey",
  ADD CONSTRAINT "Tool_activeCalculatorConfigId_fkey" FOREIGN KEY ("activeCalculatorConfigId") REFERENCES "CalculatorConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "calculatorConfigId" TEXT;
ALTER TABLE "Lead"
  DROP CONSTRAINT IF EXISTS "Lead_calculatorConfigId_fkey",
  ADD CONSTRAINT "Lead_calculatorConfigId_fkey" FOREIGN KEY ("calculatorConfigId") REFERENCES "CalculatorConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
