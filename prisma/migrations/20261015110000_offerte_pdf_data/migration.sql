-- Offerte v2: PDF's van versies en getekende PDF's als bytes in de database.
ALTER TABLE "OfferteVersie" DROP COLUMN "pdfUrl";
ALTER TABLE "OfferteVersie" ADD COLUMN "pdfData" BYTEA;
ALTER TABLE "OfferteAkkoord" DROP COLUMN "getekendePdfUrl";
ALTER TABLE "OfferteAkkoord" ADD COLUMN "getekendePdfData" BYTEA;
