-- Performance-audit (Fase 2, P1.3): dekt de company-brede /dashboard/leads
-- query (findMany where companyId, orderBy createdAt desc) — voorheen alleen
-- gedekt door Lead_companyId_status_idx, die niet op createdAt sorteert.
-- IF NOT EXISTS voor idempotentie, zelfde conventie als eerdere migraties.
CREATE INDEX IF NOT EXISTS "Lead_companyId_createdAt_idx" ON "Lead"("companyId", "createdAt");
