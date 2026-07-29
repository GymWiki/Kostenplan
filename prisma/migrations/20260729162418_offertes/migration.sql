-- Offertes (fase 1): bewerkbaar concept per Lead, gedeeld via een
-- niet-raadbare token-link + PDF, nooit automatisch verstuurd. Zie
-- app/lib/actions/offertes.ts.

ALTER TABLE "Branding" ADD COLUMN "offerteIntroTekst" TEXT;
ALTER TABLE "Branding" ADD COLUMN "offerteVoorwaardenTekst" TEXT;
ALTER TABLE "Branding" ADD COLUMN "offerteGeldigheidsdagen" INTEGER NOT NULL DEFAULT 30;

CREATE TYPE "OfferteStatus" AS ENUM ('CONCEPT', 'VERSTUURD', 'GEACCEPTEERD', 'AFGEWEZEN', 'VERLOPEN');

CREATE TABLE "Offerte" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "OfferteStatus" NOT NULL DEFAULT 'CONCEPT',
    "regels" JSONB NOT NULL,
    "introTekst" TEXT,
    "voorwaardenTekst" TEXT,
    "geldigTot" TIMESTAMP(3) NOT NULL,
    "deelToken" TEXT,
    "pdfUrl" TEXT,
    "verstuurdOp" TIMESTAMP(3),
    "gereageerdOp" TIMESTAMP(3),
    "klantReactie" TEXT,
    "reactieGezien" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offerte_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Offerte_leadId_key" ON "Offerte"("leadId");
CREATE UNIQUE INDEX "Offerte_deelToken_key" ON "Offerte"("deelToken");

ALTER TABLE "Offerte" ADD CONSTRAINT "Offerte_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zelfde rationale als de bestaande enable_rls-migraties: de app benadert
-- deze tabel uitsluitend via Prisma als tabelowner (vrijgesteld van RLS),
-- nooit via Supabase's Data API — RLS zonder policies sluit die laatste
-- route voor anon/authenticated volledig af.
ALTER TABLE "Offerte" ENABLE ROW LEVEL SECURITY;
