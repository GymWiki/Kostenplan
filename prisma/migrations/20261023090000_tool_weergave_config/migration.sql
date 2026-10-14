-- Weergave en plaatsing van de klant-rekentool (tegels / stappen / lijst; in de pagina of pop-up).
-- Leeg object = de huidige weergave "Alles op één pagina": bestaande rekentools veranderen niet.
ALTER TABLE "Tool" ADD COLUMN "weergaveConfig" JSONB NOT NULL DEFAULT '{}';
