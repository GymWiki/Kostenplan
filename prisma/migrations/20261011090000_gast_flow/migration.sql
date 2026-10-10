-- Probeer-flow zonder account: bedrijf van een gast + funnelgebeurtenissen.
ALTER TABLE "Company" ADD COLUMN "gastVerlooptOp" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "gastBron" JSONB;
CREATE INDEX "Company_gastVerlooptOp_idx" ON "Company"("gastVerlooptOp");

CREATE TABLE "GastGebeurtenis" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sessie" TEXT,
    "bron" TEXT NOT NULL DEFAULT 'direct',
    "metSite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GastGebeurtenis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GastGebeurtenis_type_createdAt_idx" ON "GastGebeurtenis"("type", "createdAt");
CREATE INDEX "GastGebeurtenis_bron_createdAt_idx" ON "GastGebeurtenis"("bron", "createdAt");

-- Zelfde toegangsmodel als de rest: alleen via Prisma, nooit via de Data API.
ALTER TABLE "GastGebeurtenis" ENABLE ROW LEVEL SECURITY;
