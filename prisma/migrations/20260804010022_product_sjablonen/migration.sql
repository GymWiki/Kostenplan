-- Rekentool-sjablonen fase 1 (fundament): nieuwe kolommen op Product plus
-- ProductStaffel. Puur additief — bestaande producten krijgen het default
-- sjabloon ENKELE_HOEVEELHEID en prijsPerEenheid = NULL, dus hun huidige
-- (materiaalCategorieen-gebaseerde) prijsberekening blijft ongewijzigd.
-- Zie app/lib/calculate.ts voor de nieuwe, geïsoleerde prijsPerEenheid-tak.

CREATE TYPE "ProductSjabloon" AS ENUM ('ENKELE_HOEVEELHEID', 'AFMETINGEN', 'RUIMTES', 'ARTIKELREGELS');

ALTER TABLE "Product" ADD COLUMN "sjabloon" "ProductSjabloon" NOT NULL DEFAULT 'ENKELE_HOEVEELHEID';
ALTER TABLE "Product" ADD COLUMN "sjabloonConfig" JSONB;
ALTER TABLE "Product" ADD COLUMN "prijsPerEenheid" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN "prijsPerEenheidType" "PrijsType" NOT NULL DEFAULT 'VAST';
ALTER TABLE "Product" ADD COLUMN "prijsPerEenheidMin" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN "prijsPerEenheidMax" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN "minimumprijs" DOUBLE PRECISION;

CREATE TABLE "ProductStaffel" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vanaf" DOUBLE PRECISION NOT NULL,
    "prijsPerEenheid" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductStaffel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductStaffel_productId_idx" ON "ProductStaffel"("productId");

ALTER TABLE "ProductStaffel" ADD CONSTRAINT "ProductStaffel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zelfde rationale als de bestaande enable_rls-migraties: de app benadert
-- deze tabel uitsluitend via Prisma als tabelowner (vrijgesteld van RLS),
-- nooit via Supabase's Data API.
ALTER TABLE "ProductStaffel" ENABLE ROW LEVEL SECURITY;
