-- Idempotentiesleutel bij het registreren van een betaling: dezelfde sleutel (een dubbele klik, een herhaalde aanvraag
-- na een time-out) levert nooit een tweede betaling op.
ALTER TABLE "FactuurBetaling" ADD COLUMN "sleutel" TEXT;
CREATE UNIQUE INDEX "FactuurBetaling_factuurId_sleutel_key" ON "FactuurBetaling"("factuurId", "sleutel");
