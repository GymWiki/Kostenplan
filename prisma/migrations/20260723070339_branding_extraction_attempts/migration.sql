-- Rate-limit-/lichte auditlog voor /api/branding/extract (auto-branding
-- vanaf website-URL) — max 10 aanroepen per gebruiker per uur, zie de route.
CREATE TABLE "BrandingExtractionAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandingExtractionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandingExtractionAttempt_userId_createdAt_idx" ON "BrandingExtractionAttempt"("userId", "createdAt");

ALTER TABLE "BrandingExtractionAttempt" ADD CONSTRAINT "BrandingExtractionAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zelfde rationale als de bestaande enable_rls-migraties: de app benadert
-- deze tabel uitsluitend via Prisma als tabelowner (vrijgesteld van RLS),
-- nooit via Supabase's Data API — RLS zonder policies sluit die laatste
-- route voor anon/authenticated volledig af.
ALTER TABLE "BrandingExtractionAttempt" ENABLE ROW LEVEL SECURITY;
