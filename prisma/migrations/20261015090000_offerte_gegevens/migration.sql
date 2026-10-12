-- Offerte v2, fase 1: offertegegevens per bedrijf en nummerteller.
CREATE TYPE "Rechtsvorm" AS ENUM ('EENMANSZAAK', 'VOF', 'MAATSCHAP', 'BV', 'NV', 'ANDERS');

CREATE TABLE "OfferteGegevens" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "handelsnaam" TEXT,
    "rechtsvorm" "Rechtsvorm" NOT NULL DEFAULT 'EENMANSZAAK',
    "statutaireNaam" TEXT,
    "statutaireZetel" TEXT,
    "kvkNummer" TEXT,
    "adresRegel" TEXT,
    "postcode" TEXT,
    "plaats" TEXT,
    "btwId" TEXT,
    "korActief" BOOLEAN NOT NULL DEFAULT false,
    "korTekst" TEXT NOT NULL DEFAULT 'Btw niet van toepassing (kleineondernemersregeling)',
    "iban" TEXT,
    "ibanTenaamstelling" TEXT,
    "telefoon" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "contactNaam" TEXT,
    "contactFunctie" TEXT,
    "voorwaardenPdfUrl" TEXT,
    "voorwaardenPdfNaam" TEXT,
    "nummerPrefix" TEXT NOT NULL DEFAULT '',
    "geldigheidDagen" INTEGER NOT NULL DEFAULT 30,
    "betaalPreset" TEXT NOT NULL DEFAULT 'NA_OPLEVERING',
    "betaalTermijnen" JSONB,
    "introTekst" TEXT,
    "slotTekst" TEXT,
    "voorwaardenBlokken" JSONB,
    "herroepingTekst" TEXT,
    "btwStandaard" JSONB,
    "herinneringDagen" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferteGegevens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfferteGegevens_companyId_key" ON "OfferteGegevens"("companyId");
ALTER TABLE "OfferteGegevens" ADD CONSTRAINT "OfferteGegevens_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OfferteNummerTeller" (
    "companyId" TEXT NOT NULL,
    "jaar" INTEGER NOT NULL,
    "laatste" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OfferteNummerTeller_pkey" PRIMARY KEY ("companyId","jaar")
);

-- Zoals de andere tabellen: alleen via Prisma (tabelowner) bereikbaar.
ALTER TABLE "OfferteGegevens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OfferteNummerTeller" ENABLE ROW LEVEL SECURITY;
