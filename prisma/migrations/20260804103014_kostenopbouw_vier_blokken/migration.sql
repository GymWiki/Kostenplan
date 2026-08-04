-- Kostenopbouw in vier blokken (materiaal, arbeid, transport, voorrijkosten),
-- vervangt het "handmatige basisprijs + meerprijs per materiaal + globale
-- marge"-model volledig. Materiaalprijzen (MaterialOption.prijs) zijn
-- voortaan altijd de volledige verkoopprijs per eenheid. Zie
-- app/lib/calculate.ts voor het nieuwe rekenmodel.

-- === CostSettings ===================================================

ALTER TABLE "CostSettings" ADD COLUMN "arbeidTariefUur" DOUBLE PRECISION NOT NULL DEFAULT 45;
ALTER TABLE "CostSettings" ADD COLUMN "arbeidTariefDagdeel" DOUBLE PRECISION NOT NULL DEFAULT 180;
ALTER TABLE "CostSettings" ADD COLUMN "arbeidTariefDag" DOUBLE PRECISION NOT NULL DEFAULT 360;

-- Zet het bestaande tarief in de kolom die bij de actieve arbeidStapEenheid
-- hoort; de andere twee krijgen een grove omrekening (1 dag = 2 dagdelen =
-- 8 uur) zodat er nooit een onrealistische 0 blijft staan. De vakman kan dit
-- achteraf zelf corrigeren via Kosteninstellingen.
UPDATE "CostSettings" SET
  "arbeidTariefUur" = CASE "arbeidStapEenheid"
    WHEN 'UUR' THEN "arbeidTarief"
    WHEN 'DAGDEEL' THEN "arbeidTarief" / 4
    WHEN 'DAG' THEN "arbeidTarief" / 8
  END,
  "arbeidTariefDagdeel" = CASE "arbeidStapEenheid"
    WHEN 'UUR' THEN "arbeidTarief" * 4
    WHEN 'DAGDEEL' THEN "arbeidTarief"
    WHEN 'DAG' THEN "arbeidTarief" / 2
  END,
  "arbeidTariefDag" = CASE "arbeidStapEenheid"
    WHEN 'UUR' THEN "arbeidTarief" * 8
    WHEN 'DAGDEEL' THEN "arbeidTarief" * 2
    WHEN 'DAG' THEN "arbeidTarief"
  END;

ALTER TABLE "CostSettings" ADD COLUMN "arbeidAfronden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CostSettings" ADD COLUMN "transportTarief" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "CostSettings" DROP COLUMN "arbeidTarief";
ALTER TABLE "CostSettings" DROP COLUMN "arbeidTariefPerProduct";
ALTER TABLE "CostSettings" DROP COLUMN "materiaalMarge";
ALTER TABLE "CostSettings" DROP COLUMN "materiaalMargePerProduct";

-- === Product =========================================================

ALTER TABLE "Product" RENAME COLUMN "arbeidsCapaciteit" TO "productiviteit";

-- transportkosten was altijd verplicht en gold altijd (geen company-default
-- om op terug te vallen) — wordt de nieuwe override 1-op-1, zodat de
-- uitkomst per product ongewijzigd blijft.
ALTER TABLE "Product" RENAME COLUMN "transportkosten" TO "transportkostenOverride";
ALTER TABLE "Product" ALTER COLUMN "transportkostenOverride" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "transportkostenOverride" DROP DEFAULT;
ALTER TABLE "Product" ADD COLUMN "transportMeeschalend" BOOLEAN NOT NULL DEFAULT false;

-- Voorrijkosten bestond nooit per product (alleen company-breed) — nieuwe
-- kolom blijft dus NULL voor bestaande producten, wat hetzelfde gedrag geeft
-- (overnemen van de company-instelling).
ALTER TABLE "Product" ADD COLUMN "voorrijkostenOverride" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN "voorrijMeeschalend" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Product" DROP COLUMN "materiaalMargeOverride";

-- Bestaande handmatige basisprijs (prijsPerEenheid) wordt de prijs van een
-- nieuw aangemaakte standaard-materiaalcategorie/-optie, zodat de uitkomst
-- voor bestaande producten identiek blijft — de vakman kan 'm daarna zelf
-- verder uitsplitsen. Producten zonder prijsPerEenheid (al volledig via
-- materiaalCategorieen geprijsd) blijven ongemoeid.
WITH nieuwe_categorie AS (
  INSERT INTO "MaterialCategory" ("id", "productId", "naam", "order", "verplicht", "createdAt")
  SELECT
    gen_random_uuid()::text,
    p."id",
    'Materiaal',
    COALESCE((SELECT MAX(mc."order") + 1 FROM "MaterialCategory" mc WHERE mc."productId" = p."id"), 0),
    true,
    now()
  FROM "Product" p
  WHERE p."prijsPerEenheid" IS NOT NULL
  RETURNING "id" AS "categoryId", "productId"
)
INSERT INTO "MaterialOption"
  ("id", "materialCategoryId", "naam", "prijs", "prijsType", "prijsMin", "prijsMax", "actief", "order", "createdAt")
SELECT
  gen_random_uuid()::text,
  nc."categoryId",
  'Standaard',
  p."prijsPerEenheid",
  p."prijsPerEenheidType",
  p."prijsPerEenheidMin",
  p."prijsPerEenheidMax",
  true,
  0,
  now()
FROM nieuwe_categorie nc
JOIN "Product" p ON p."id" = nc."productId";

ALTER TABLE "Product" DROP COLUMN "prijsPerEenheid";
ALTER TABLE "Product" DROP COLUMN "prijsPerEenheidType";
ALTER TABLE "Product" DROP COLUMN "prijsPerEenheidMin";
ALTER TABLE "Product" DROP COLUMN "prijsPerEenheidMax";
ALTER TABLE "Product" DROP COLUMN "minimumprijs";

DROP TABLE "ProductStaffel";

-- === MaterialOption ==================================================

ALTER TABLE "MaterialOption" ADD COLUMN "productiviteitOverride" DOUBLE PRECISION;
