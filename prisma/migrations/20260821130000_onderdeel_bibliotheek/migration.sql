-- Levering B v2 (modulair Onderdelensysteem): introduceert
-- OnderdeelBibliotheek, de company-brede "Mijn onderdelen"-bibliotheek
-- (Deel 8/12 van de opdracht) — een zelfgemaakt Onderdeel opslaan en later
-- hergebruiken in een andere Tool van hetzelfde bedrijf (copy-on-use, zie
-- app/lib/actions/onderdelen.ts).
--
-- Volledig additief: één nieuwe tabel, geen wijzigingen aan bestaande
-- tabellen. Tool/CalculatorConfig/Lead/Product/MaterialCategory/
-- MaterialOption blijven ongewijzigd — het modulaire Onderdelensysteem zelf
-- leeft in CalculatorConfig.config (Json, versie 2), dat al bestond en al
-- ondoorzichtig door de draft/publish-machinery wordt behandeld (zie
-- app/lib/calculator-engine/modulair-types.ts). Geen backfill nodig.
--
-- Idempotent, zelfde stijl als 20260820150000_calculator_config: CREATE
-- TABLE/INDEX met IF NOT EXISTS, FK met DROP CONSTRAINT IF EXISTS vooraf —
-- veilig om per ongeluk twee keer te draaien. Moet tegen productie draaien
-- vóórdat de code van deze branch wordt gedeployed.

CREATE TABLE IF NOT EXISTS "OnderdeelBibliotheek" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "beschrijving" TEXT,
    "icoon" TEXT,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnderdeelBibliotheek_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OnderdeelBibliotheek_companyId_idx" ON "OnderdeelBibliotheek"("companyId");

ALTER TABLE "OnderdeelBibliotheek"
  DROP CONSTRAINT IF EXISTS "OnderdeelBibliotheek_companyId_fkey",
  ADD CONSTRAINT "OnderdeelBibliotheek_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zelfde "closed by default, geen policies"-conventie als elke andere
-- tabel (zie 20260712172520_enable_rls) — uitsluitend bereikbaar via Prisma
-- over de directe Postgres-verbinding, nooit via Supabase's Data API.
ALTER TABLE "OnderdeelBibliotheek" ENABLE ROW LEVEL SECURITY;
