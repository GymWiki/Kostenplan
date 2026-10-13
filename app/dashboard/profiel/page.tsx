import type { Metadata } from "next";
import { getToolCostSettings, requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier } from "@/app/lib/subscription";
import { pushBeschikbaar } from "@/app/lib/push/versturen";
import { ProfielView } from "./profiel-view";
import { laadOfferteGegevens } from "@/app/lib/offerte/gegevens-server";
import { parseWerkgebied } from "@/app/lib/werkgebied/schema";

export const metadata: Metadata = { title: "Profiel" };

export default async function ProfielPage({
  searchParams,
}: {
  searchParams: Promise<{ gewijzigd?: string; checkout?: string }>;
}) {
  const [{ user, company, alleBedrijven }, params] = await Promise.all([requireActiveCompany(), searchParams]);

  const tools = await prisma.tool.findMany({
    where: { companyId: company.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, naam: true, branding: { select: { logoUrl: true, primaireKleur: true } } },
  });
  const offertegegevens = await laadOfferteGegevens(company);
  const kosten = tools[0] ? await getToolCostSettings(tools[0].id, company) : null;
  const eenheid = kosten?.arbeidStapEenheid ?? "DAGDEEL";
  const tarief = kosten
    ? eenheid === "UUR"
      ? kosten.arbeidTariefUur
      : eenheid === "DAG"
        ? kosten.arbeidTariefDag
        : kosten.arbeidTariefDagdeel
    : 180;

  return (
    <ProfielView
      pushBeschikbaar={pushBeschikbaar()}
      email={user.email}
      activeCompanyId={company.id}
      companies={alleBedrijven}
      tarieven={{
        eenheid,
        tarief,
        voorrij: kosten?.voorrijTarief ?? company.standaardVoorrijTarief,
        transport: kosten?.transportTarief ?? 0,
      }}
      offertegegevens={offertegegevens}
      werkgebied={parseWerkgebied(company.werkgebied)}
      branding={tools.map((t) => ({
        toolId: t.id,
        toolNaam: t.naam,
        logoUrl: t.branding?.logoUrl ?? null,
        primaireKleur: t.branding?.primaireKleur ?? "#15803d",
      }))}
      abonnement={{
        companyId: company.id,
        effectivePlan: effectiveTier(company),
        isOverridden: company.overrideTier !== null,
        actualPlan: company.subscriptionTier,
        actualInterval: company.billingInterval,
        subscriptionStatus: company.subscriptionStatus,
        huidigePeriodeEindLabel: company.huidigePeriodeEind
          ? new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" }).format(company.huidigePeriodeEind)
          : null,
        gewijzigd: params.gewijzigd === "1",
        checkoutAfgerond: params.checkout === "afgerond",
      }}
    />
  );
}
