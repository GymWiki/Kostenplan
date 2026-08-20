-- Achterstallige migratie, ontdekt tijdens het voorbereiden van de
-- multi-tool-migratie hierna: `LeadStatus.EXTERN_AFGEHANDELD`,
-- `OfferteStatus.INGETROKKEN`, `Lead.externAfgehandeldOp`,
-- `Lead.externAfgehandeldNotitie` en `Offerte.ingetrokkenOp` staan al in
-- schema.prisma (en zijn — na een eerdere handmatige noodfix rond exact
-- Lead.externAfgehandeldOp, zie markExternAfgehandeldAction/
-- intrekOfferteAction in app/lib/actions/offertes.ts — vermoedelijk al
-- rechtstreeks in productie aanwezig), maar stonden in géén enkel
-- migratiebestand. `npx prisma migrate diff` tegen een schone, vanaf-nul
-- gemigreerde database liet dit gat zien.
--
-- Zonder deze migratie zou een schone/staging-omgeving, of een restore-from-
-- backup-en-migrate, deze kolommen missen — exact hetzelfde faalpatroon als
-- de eerdere productiestoring rond Lead.externAfgehandeldOp (Prisma
-- selecteert deze kolommen standaard mee bij elke Lead/Offerte-query zodra
-- de Prisma Client ze kent, ongeacht of de kolom in de database bestaat).
--
-- Idempotent en veilig te herhalen (ook als productie deze kolommen al via
-- de eerdere noodfix heeft): ADD VALUE IF NOT EXISTS / ADD COLUMN IF NOT
-- EXISTS zijn beide no-ops als het doel al bestaat.

ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'EXTERN_AFGEHANDELD';
ALTER TYPE "OfferteStatus" ADD VALUE IF NOT EXISTS 'INGETROKKEN';

ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "externAfgehandeldOp" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "externAfgehandeldNotitie" TEXT;

ALTER TABLE "Offerte" ADD COLUMN IF NOT EXISTS "ingetrokkenOp" TIMESTAMP(3);
