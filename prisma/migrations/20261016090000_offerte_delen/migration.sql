-- Offerte delen via eigen mail/app: berichtteksten; de automatische herinnering (cron) vervalt.
ALTER TABLE "OfferteGegevens" ADD COLUMN "deelTekst" TEXT;
ALTER TABLE "OfferteGegevens" ADD COLUMN "herinneringTekst" TEXT;
ALTER TABLE "OfferteGegevens" DROP COLUMN "herinneringDagen";
