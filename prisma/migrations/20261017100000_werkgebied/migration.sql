-- Werkgebied en minimale opdracht: instellingen per bedrijf, optioneel per rekentool. Null = uit / overnemen.
ALTER TABLE "Company" ADD COLUMN "werkgebied" JSONB;
ALTER TABLE "Tool" ADD COLUMN "werkgebied" JSONB;
