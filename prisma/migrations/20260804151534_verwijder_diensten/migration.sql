-- Verwijdert de Diensten-feature volledig: alles kan voortaan via Producten.
-- Lead.snapshot/Offerte.regels zijn JSON-kolommen zonder foreign key naar
-- Service — bestaande historische snapshots met "dienst"-regels blijven
-- na deze migratie gewoon leesbaar, alleen worden er geen nieuwe meer
-- aangemaakt. Zie app/lib/leads.ts.

DROP TABLE "Service";

DROP TYPE "ServicePrijsType";
