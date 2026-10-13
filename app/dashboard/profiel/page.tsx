import type { Metadata } from "next";
import { getToolCostSettings, requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { abonnementRegel, domeinVan, werkgebiedRegel } from "@/app/lib/profiel/samenvattingen";
import { ontbrekendeVerplichteGegevens } from "@/app/lib/offerte/gegevens";
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
  const onderdelenGebruikt = await prisma.product.count({ where: { tool: { companyId: company.id } } });
  const plan = effectiveTier(company);
  const werkgebied = parseWerkgebied(company.werkgebied);
  const logoUrl = tools.map((t) => t.branding?.logoUrl).find(Boolean) ?? offertegegevens.logoUrl ?? null;
  const kleuren = [...new Set(tools.map((t) => t.branding?.primaireKleur).filter((k): k is string => Boolean(k)))];
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
      werkgebied={werkgebied}
      bedrijfOverzicht={{
        actief: { id: company.id, naam: company.naam, logoUrl, domein: domeinVan(offertegegevens.website) },
        bedrijven: alleBedrijven.map((b) => ({ id: b.id, naam: b.naam })),
        samenvatting: { werkgebied: werkgebiedRegel(werkgebied), kleuren, logoUrl, offertegegevensOntbreken: ontbrekendeVerplichteGegevens(offertegegevens).length > 0 },
        abonnement: abonnementRegel({
          plan,
          handmatigToegekend: company.overrideTier !== null,
          status: company.subscriptionStatus,
          periodeEind: company.huidigePeriodeEind,
          gepauzeerdTot: company.gepauzeerdTot,
          gebruikteOnderdelen: onderdelenGebruikt,
          limietOnderdelen: PLAN_LIMITS[plan].maxProductsPerCompany,
        }),
        abonnementLoopt: !["GEEN", "CANCELED", "COMPLETED"].includes(company.subscriptionStatus),
      }}
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
