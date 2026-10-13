-- Voortgang van een lead: handmatige stappen en de tijdlijn daarvan.
ALTER TABLE "Lead"
  ADD COLUMN "inContactOp" TIMESTAMP(3),
  ADD COLUMN "ingeplandStartweek" TEXT,
  ADD COLUMN "ingeplandOp" TIMESTAMP(3),
  ADD COLUMN "opgeleverdOp" DATE,
  ADD COLUMN "verlorenReden" TEXT,
  ADD COLUMN "verlorenOp" TIMESTAMP(3);

CREATE TABLE "LeadGebeurtenis" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "soort" TEXT NOT NULL,
  "tekst" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadGebeurtenis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LeadGebeurtenis_leadId_createdAt_idx" ON "LeadGebeurtenis"("leadId", "createdAt");
ALTER TABLE "LeadGebeurtenis" ADD CONSTRAINT "LeadGebeurtenis_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
