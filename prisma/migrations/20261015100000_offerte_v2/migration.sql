-- Offerte v2, fase 2: offertes met versies, audittrail en standaardregels.
CREATE TYPE "OfferteV2Status" AS ENUM ('CONCEPT', 'VERSTUURD', 'BEKEKEN', 'GEACCEPTEERD', 'AFGEWEZEN', 'VERLOPEN', 'INGETROKKEN');
CREATE TYPE "OfferteGebeurtenisSoort" AS ENUM ('VERZONDEN', 'BEKEKEN', 'VRAAG', 'AFGEWEZEN', 'AKKOORD', 'INGETROKKEN', 'HERINNERING');

CREATE TABLE "OfferteV2" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadId" TEXT,
    "nummer" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "OfferteV2Status" NOT NULL DEFAULT 'CONCEPT',
    "huidigeVersie" INTEGER NOT NULL DEFAULT 1,
    "verstuurdOp" TIMESTAMP(3),
    "eersteBekekenOp" TIMESTAMP(3),
    "herinneringVerstuurdOp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OfferteV2_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OfferteV2_token_key" ON "OfferteV2"("token");
CREATE UNIQUE INDEX "OfferteV2_companyId_nummer_key" ON "OfferteV2"("companyId", "nummer");
CREATE INDEX "OfferteV2_leadId_idx" ON "OfferteV2"("leadId");
CREATE INDEX "OfferteV2_companyId_status_idx" ON "OfferteV2"("companyId", "status");

CREATE TABLE "OfferteVersie" (
    "id" TEXT NOT NULL,
    "offerteId" TEXT NOT NULL,
    "versie" INTEGER NOT NULL,
    "inhoud" JSONB NOT NULL,
    "totaalExclCenten" INTEGER NOT NULL DEFAULT 0,
    "totaalInclCenten" INTEGER NOT NULL DEFAULT 0,
    "vergrendeld" BOOLEAN NOT NULL DEFAULT false,
    "verstuurdOp" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "pdfHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OfferteVersie_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OfferteVersie_offerteId_versie_key" ON "OfferteVersie"("offerteId", "versie");

CREATE TABLE "OfferteAkkoord" (
    "id" TEXT NOT NULL,
    "offerteId" TEXT NOT NULL,
    "versieId" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "tijdstip" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "versieNummer" INTEGER NOT NULL,
    "gekozenRegelIds" JSONB NOT NULL,
    "totaalInclCenten" INTEGER NOT NULL,
    "pdfHash" TEXT NOT NULL,
    "getekendePdfUrl" TEXT,
    "getekendePdfHash" TEXT,
    CONSTRAINT "OfferteAkkoord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OfferteAkkoord_versieId_key" ON "OfferteAkkoord"("versieId");
CREATE INDEX "OfferteAkkoord_offerteId_idx" ON "OfferteAkkoord"("offerteId");

CREATE TABLE "OfferteGebeurtenis" (
    "id" TEXT NOT NULL,
    "offerteId" TEXT NOT NULL,
    "versieNummer" INTEGER,
    "soort" "OfferteGebeurtenisSoort" NOT NULL,
    "tekst" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfferteGebeurtenis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OfferteGebeurtenis_offerteId_createdAt_idx" ON "OfferteGebeurtenis"("offerteId", "createdAt");

CREATE TABLE "OfferteStandaardRegel" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "omschrijving" TEXT NOT NULL,
    "eenheid" TEXT NOT NULL,
    "prijsCenten" INTEGER NOT NULL,
    "btw" INTEGER NOT NULL DEFAULT 21,
    "soort" TEXT NOT NULL DEFAULT 'overig',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfferteStandaardRegel_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OfferteStandaardRegel_companyId_idx" ON "OfferteStandaardRegel"("companyId");

ALTER TABLE "OfferteV2" ADD CONSTRAINT "OfferteV2_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferteV2" ADD CONSTRAINT "OfferteV2_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OfferteVersie" ADD CONSTRAINT "OfferteVersie_offerteId_fkey" FOREIGN KEY ("offerteId") REFERENCES "OfferteV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferteAkkoord" ADD CONSTRAINT "OfferteAkkoord_offerteId_fkey" FOREIGN KEY ("offerteId") REFERENCES "OfferteV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferteAkkoord" ADD CONSTRAINT "OfferteAkkoord_versieId_fkey" FOREIGN KEY ("versieId") REFERENCES "OfferteVersie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferteGebeurtenis" ADD CONSTRAINT "OfferteGebeurtenis_offerteId_fkey" FOREIGN KEY ("offerteId") REFERENCES "OfferteV2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferteStandaardRegel" ADD CONSTRAINT "OfferteStandaardRegel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfferteV2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OfferteVersie" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OfferteAkkoord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OfferteGebeurtenis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OfferteStandaardRegel" ENABLE ROW LEVEL SECURITY;
