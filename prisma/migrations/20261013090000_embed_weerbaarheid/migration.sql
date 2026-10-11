-- Embed-weerbaarheid: gepubliceerde snapshot per rekentool + idempotentie en
-- e-mail-outbox op leads.
ALTER TABLE "Tool"
  ADD COLUMN "snapshotVersie" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "snapshotHash" TEXT,
  ADD COLUMN "snapshotOp" TIMESTAMP(3),
  ADD COLUMN "snapshotFout" TEXT,
  ADD COLUMN "snapshotVuil" BOOLEAN NOT NULL DEFAULT false;

-- Bestaande tools hebben nog geen snapshot: markeer ze als te publiceren
-- (de achtergrond-synchronisatie / backfill pakt ze op).
UPDATE "Tool" SET "snapshotVuil" = true WHERE "deletedAt" IS NULL;

ALTER TABLE "Lead"
  ADD COLUMN "idempotentieSleutel" TEXT,
  ADD COLUMN "mailVerzondOp" TIMESTAMP(3),
  ADD COLUMN "mailPogingen" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "mailVolgendePoging" TIMESTAMP(3),
  ADD COLUMN "mailFout" TEXT;

CREATE UNIQUE INDEX "Lead_idempotentieSleutel_key" ON "Lead"("idempotentieSleutel");

-- Bestaande leads zijn al door de hovenier gezien in het dashboard; geen
-- mail meer nasturen.
UPDATE "Lead" SET "mailVerzondOp" = "createdAt";
