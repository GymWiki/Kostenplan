-- Meldingen (Web Push) bij een nieuwe lead.
CREATE TABLE "PushAbonnement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushAbonnement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushAbonnement_endpoint_key" ON "PushAbonnement"("endpoint");
CREATE INDEX "PushAbonnement_companyId_idx" ON "PushAbonnement"("companyId");

ALTER TABLE "PushAbonnement" ADD CONSTRAINT "PushAbonnement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zoals de andere tabellen: alleen via Prisma (tabelowner) bereikbaar.
ALTER TABLE "PushAbonnement" ENABLE ROW LEVEL SECURITY;
