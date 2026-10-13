-- Facturen: datamodel, nummerreeksen en onveranderlijkheid van definitieve facturen.

CREATE TYPE "FactuurType" AS ENUM ('FACTUUR', 'TERMIJN', 'EINDFACTUUR', 'CREDITNOTA');
CREATE TYPE "FactuurStatus" AS ENUM ('CONCEPT', 'DEFINITIEF', 'VERSTUURD', 'DEELS_BETAALD', 'BETAALD', 'GECREDITEERD');
CREATE TYPE "BetaalMethode" AS ENUM ('OVERBOEKING', 'CONTANT', 'PIN', 'BETAALLINK', 'OVERIG');
CREATE TYPE "FactuurGebeurtenisSoort" AS ENUM ('AANGEMAAKT', 'DEFINITIEF', 'VERZONDEN', 'BEKEKEN', 'BETALING', 'HERINNERING', 'AANMANING', 'LAATSTE_HERINNERING', 'CREDITNOTA', 'NOTITIE');

ALTER TABLE "Company" ADD COLUMN "factuurExportOp" TIMESTAMP(3);
ALTER TABLE "OfferteGegevens"
  ADD COLUMN "factuurPrefix" TEXT NOT NULL DEFAULT 'F',
  ADD COLUMN "creditPrefix" TEXT NOT NULL DEFAULT 'C',
  ADD COLUMN "factuurBetaaltermijnDagen" INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN "factuurDeelTekst" TEXT;

CREATE TABLE "Factuur" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "leadId" TEXT,
  "offerteId" TEXT,
  "offerteVersie" INTEGER,
  "reeks" TEXT NOT NULL DEFAULT 'F',
  "nummer" TEXT,
  "jaar" INTEGER,
  "volgnummer" INTEGER,
  "type" "FactuurType" NOT NULL DEFAULT 'FACTUUR',
  "status" "FactuurStatus" NOT NULL DEFAULT 'CONCEPT',
  "factuurdatum" DATE,
  "vervaldatum" DATE,
  "uitvoeringVan" DATE,
  "uitvoeringTot" DATE,
  "inhoud" JSONB NOT NULL,
  "totaalExclCenten" INTEGER NOT NULL DEFAULT 0,
  "totaalBtwCenten" INTEGER NOT NULL DEFAULT 0,
  "totaalInclCenten" INTEGER NOT NULL DEFAULT 0,
  "token" TEXT NOT NULL,
  "betaallink" TEXT,
  "notities" TEXT,
  "creditVoorId" TEXT,
  "definitiefOp" TIMESTAMP(3),
  "verstuurdOp" TIMESTAMP(3),
  "eersteBekekenOp" TIMESTAMP(3),
  "pdfData" BYTEA,
  "pdfHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Factuur_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Factuur_token_key" ON "Factuur"("token");
CREATE UNIQUE INDEX "Factuur_companyId_nummer_key" ON "Factuur"("companyId", "nummer");
CREATE INDEX "Factuur_companyId_status_idx" ON "Factuur"("companyId", "status");
CREATE INDEX "Factuur_leadId_idx" ON "Factuur"("leadId");
CREATE INDEX "Factuur_offerteId_idx" ON "Factuur"("offerteId");
CREATE INDEX "Factuur_companyId_factuurdatum_idx" ON "Factuur"("companyId", "factuurdatum");
ALTER TABLE "Factuur" ADD CONSTRAINT "Factuur_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Factuur" ADD CONSTRAINT "Factuur_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Factuur" ADD CONSTRAINT "Factuur_offerteId_fkey" FOREIGN KEY ("offerteId") REFERENCES "OfferteV2"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Factuur" ADD CONSTRAINT "Factuur_creditVoorId_fkey" FOREIGN KEY ("creditVoorId") REFERENCES "Factuur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FactuurBetaling" (
  "id" TEXT NOT NULL,
  "factuurId" TEXT NOT NULL,
  "datum" DATE NOT NULL,
  "bedragCenten" INTEGER NOT NULL,
  "methode" "BetaalMethode" NOT NULL DEFAULT 'OVERBOEKING',
  "notitie" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FactuurBetaling_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FactuurBetaling_factuurId_idx" ON "FactuurBetaling"("factuurId");
ALTER TABLE "FactuurBetaling" ADD CONSTRAINT "FactuurBetaling_factuurId_fkey" FOREIGN KEY ("factuurId") REFERENCES "Factuur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FactuurGebeurtenis" (
  "id" TEXT NOT NULL,
  "factuurId" TEXT NOT NULL,
  "soort" "FactuurGebeurtenisSoort" NOT NULL,
  "tekst" TEXT,
  "bedragCenten" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FactuurGebeurtenis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FactuurGebeurtenis_factuurId_createdAt_idx" ON "FactuurGebeurtenis"("factuurId", "createdAt");
ALTER TABLE "FactuurGebeurtenis" ADD CONSTRAINT "FactuurGebeurtenis_factuurId_fkey" FOREIGN KEY ("factuurId") REFERENCES "Factuur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FactuurNummerTeller" (
  "companyId" TEXT NOT NULL,
  "reeks" TEXT NOT NULL,
  "jaar" INTEGER NOT NULL,
  "laatste" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "FactuurNummerTeller_pkey" PRIMARY KEY ("companyId", "reeks", "jaar")
);

-- Onveranderlijkheid: een factuur die niet meer CONCEPT is, kan niet worden verwijderd (behalve doordat het hele
-- bedrijf wordt verwijderd, wat de app alleen toestaat na een export) en alleen veranderen in zijn voortgang
-- (status, verstuurd/bekeken, notities) en de eenmalig te vullen PDF. Dit geldt ook voor directe databasetoegang.
CREATE OR REPLACE FUNCTION factuur_onveranderlijk() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" = 'CONCEPT' OR NOT EXISTS (SELECT 1 FROM "Company" WHERE "id" = OLD."companyId") THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Een definitieve factuur kan niet worden verwijderd (bewaarplicht).' USING ERRCODE = 'check_violation';
  END IF;

  IF OLD."status" = 'CONCEPT' THEN
    RETURN NEW;
  END IF;

  IF NEW."status" = 'CONCEPT'
     OR NEW."companyId" IS DISTINCT FROM OLD."companyId"
     OR NEW."reeks" IS DISTINCT FROM OLD."reeks"
     OR NEW."nummer" IS DISTINCT FROM OLD."nummer"
     OR NEW."jaar" IS DISTINCT FROM OLD."jaar"
     OR NEW."volgnummer" IS DISTINCT FROM OLD."volgnummer"
     OR NEW."type" IS DISTINCT FROM OLD."type"
     OR NEW."factuurdatum" IS DISTINCT FROM OLD."factuurdatum"
     OR NEW."vervaldatum" IS DISTINCT FROM OLD."vervaldatum"
     OR NEW."uitvoeringVan" IS DISTINCT FROM OLD."uitvoeringVan"
     OR NEW."uitvoeringTot" IS DISTINCT FROM OLD."uitvoeringTot"
     OR NEW."inhoud" IS DISTINCT FROM OLD."inhoud"
     OR NEW."totaalExclCenten" IS DISTINCT FROM OLD."totaalExclCenten"
     OR NEW."totaalBtwCenten" IS DISTINCT FROM OLD."totaalBtwCenten"
     OR NEW."totaalInclCenten" IS DISTINCT FROM OLD."totaalInclCenten"
     OR NEW."token" IS DISTINCT FROM OLD."token"
     OR NEW."creditVoorId" IS DISTINCT FROM OLD."creditVoorId"
     OR NEW."definitiefOp" IS DISTINCT FROM OLD."definitiefOp"
     OR (OLD."pdfData" IS NOT NULL AND NEW."pdfData" IS DISTINCT FROM OLD."pdfData")
     OR (OLD."pdfHash" IS NOT NULL AND NEW."pdfHash" IS DISTINCT FROM OLD."pdfHash") THEN
    RAISE EXCEPTION 'Een definitieve factuur kan niet worden gewijzigd. Maak een creditnota.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Factuur_onveranderlijk"
  BEFORE UPDATE OR DELETE ON "Factuur"
  FOR EACH ROW EXECUTE FUNCTION factuur_onveranderlijk();

-- Een definitief nummer mag niet meer leeg worden of een andere waarde krijgen: de nummering is de basis van de administratie.
CREATE OR REPLACE FUNCTION factuur_nummer_vast() RETURNS trigger AS $$
BEGIN
  IF NEW."status" <> 'CONCEPT' AND NEW."nummer" IS NULL THEN
    RAISE EXCEPTION 'Een definitieve factuur heeft een nummer nodig.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Factuur_nummer_vast"
  BEFORE INSERT OR UPDATE ON "Factuur"
  FOR EACH ROW EXECUTE FUNCTION factuur_nummer_vast();
