-- Optimistic locking voor het opslaan van concepten: elke opslag verhoogt de revisie;
-- een opslag met een verouderde revisie wordt geweigerd (twee tabbladen overschrijven elkaar niet meer).
ALTER TABLE "OfferteVersie" ADD COLUMN "revisie" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Factuur" ADD COLUMN "revisie" INTEGER NOT NULL DEFAULT 0;
