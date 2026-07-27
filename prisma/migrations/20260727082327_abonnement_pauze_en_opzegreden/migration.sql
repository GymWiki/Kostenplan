-- Retentie-flow bij opzeggen: abonnement pauzeren als alternatief voor
-- direct opzeggen, en optionele reden-registratie bij een daadwerkelijke
-- opzegging (zie app/components/dashboard/cancel-retention-modal.tsx).

ALTER TABLE "Company" ADD COLUMN "gepauzeerdTot" TIMESTAMP(3);

CREATE TYPE "OpzegReden" AS ENUM ('TE_DUUR', 'GEBRUIK_TE_WEINIG', 'MIST_FUNCTIE', 'ANDERS');

CREATE TABLE "CancellationFeedback" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reden" "OpzegReden" NOT NULL,
    "toelichting" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CancellationFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CancellationFeedback_companyId_idx" ON "CancellationFeedback"("companyId");

ALTER TABLE "CancellationFeedback" ADD CONSTRAINT "CancellationFeedback_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zelfde rationale als de bestaande enable_rls-migraties: de app benadert
-- deze tabel uitsluitend via Prisma als tabelowner (vrijgesteld van RLS),
-- nooit via Supabase's Data API — RLS zonder policies sluit die laatste
-- route voor anon/authenticated volledig af.
ALTER TABLE "CancellationFeedback" ENABLE ROW LEVEL SECURITY;
