-- Metingen per weergave en plaatsing van de klant-rekentool (zonder persoonsgegevens).
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'ONDERDEEL_GEOPEND';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'ONDERDEEL_TOEGEVOEGD';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'OVERZICHT_BEKEKEN';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'AANVRAAG_GESTART';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'AANVRAAG_VERSTUURD';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'POPUP_GEOPEND';

ALTER TABLE "AnalyticsEvent" ADD COLUMN "weergave" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "plaatsing" TEXT;
