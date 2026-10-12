-- Offerte v2, fase 8: geldig-tot en "reactie gezien" voor het overzicht in Leads.
ALTER TABLE "OfferteV2" ADD COLUMN "geldigTot" TIMESTAMP(3);
ALTER TABLE "OfferteV2" ADD COLUMN "reactieGezien" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "OfferteV2_status_geldigTot_idx" ON "OfferteV2"("status", "geldigTot");
