import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { resolveActiveMembership } from "@/app/lib/active-company";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { resolveCostSettings, type AccountDefaults } from "@/app/lib/tools";
import { legeCalculatorConfig } from "@/app/lib/calculator-engine";
import type { Prisma } from "@/app/generated/prisma/client";

// Onthoudt welk bedrijf de gebruiker laatst actief had gekozen (zie de
// bedrijfsswitcher en switchActiveCompanyAction). Alleen relevant zodra
// iemand lid is van 2+ bedrijven — requireActiveCompany() hieronder valt
// terug op het oudste bedrijf als deze cookie ontbreekt, geen match heeft
// met een echt lidmaatschap, of nog nooit gezet is.
export const ACTIEF_BEDRIJF_COOKIE = "kostenplan_actief_bedrijf";

export const verifySupabaseUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  return user;
});

// Cached per request: the dashboard layout and every nested dashboard page
// each call requireUser() independently, so without this every single
// dashboard page load would re-query the User row from Postgres twice (once
// for the layout, once for the page) instead of once. Relies on
// verifySupabaseUser() above also being cached and returning the same
// object reference within a request, which is what cache() dedupes on.
//
// Bewust GEEN Company hier aanmaken: de auth-actie (registerAction /
// signInWithGoogleAction) maakt alleen het Supabase Auth-account aan, geen
// Company — dat gebeurt pas op /onboarding/bedrijf, voor zowel Google- als
// e-mail/wachtwoord-gebruikers. requireActiveCompany() hieronder stuurt een
// gebruiker zonder bedrijf daar naartoe, waar createCompanyAction een echte,
// door de gebruiker gekozen naam aan de Company hangt.
const ensureProfile = cache(async (authUser: { id: string; email?: string }) => {
  return prisma.user.upsert({
    where: { id: authUser.id },
    create: { id: authUser.id, email: authUser.email ?? "" },
    update: {},
  });
});

export async function requireUser() {
  const authUser = await verifySupabaseUser();
  return ensureProfile(authUser);
}

// Het bedrijf waarvan de ingelogde gebruiker momenteel de data ziet, plus de
// volledige lijst van bedrijven waar diegene lid van is (voor de
// bedrijfsswitcher — zo hoeft die geen aparte query te doen). Kiest het
// bedrijf uit de ACTIEF_BEDRIJF_COOKIE als die overeenkomt met een echt
// lidmaatschap; anders het oudste (eerste) lidmaatschap. Voor bestaande,
// gemigreerde gebruikers met precies één bedrijf levert dat altijd exact
// hetzelfde bedrijf op, ongeacht de cookie.
export const requireActiveCompany = cache(async () => {
  const user = await requireUser();
  const memberships = await prisma.companyMember.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { company: true },
  });

  // Gebruikers die niet via registerAction zijn binnengekomen (Google-login,
  // of een account rechtstreeks aangemaakt in Supabase Auth) hebben nog geen
  // Company — stuur ze naar de onboarding-pagina om er zelf één aan te maken
  // in plaats van automatisch iets te verzinnen op basis van hun e-mailadres.
  if (memberships.length === 0) {
    redirect("/onboarding/bedrijf");
  }

  const cookieStore = await cookies();
  const gekozenId = cookieStore.get(ACTIEF_BEDRIJF_COOKIE)?.value;
  const actief = resolveActiveMembership(memberships, gekozenId);

  // Lazy einde-van-pauze-check (zie Company.gepauzeerdTot): een gepauzeerd
  // abonnement heeft geen cronjob die op tijd afloopt, dus dit is het moment
  // waarop we dat inhalen — bij de eerstvolgende keer dat iemand van dit
  // bedrijf iets in het dashboard opent nadat de pauze is verstreken.
  let company = actief.company;
  if (company.gepauzeerdTot && company.gepauzeerdTot < new Date()) {
    company = await prisma.company.update({
      where: { id: company.id },
      data: { subscriptionTier: "GRATIS", gepauzeerdTot: null },
    });
  }

  return {
    user,
    company,
    alleBedrijven: memberships.map((m) => (m.company.id === company.id ? company : m.company)),
  };
});

// De tool-tegenhanger van requireActiveCompany() hierboven — spiegelt exact
// hetzelfde principe: de URL bepaalt welke tool wordt gevraagd
// (/dashboard/tools/[toolId]/...), maar autorisatie gebeurt altijd hier,
// server-side. Een toolId die niet bij het actieve bedrijf hoort (van een
// ander bedrijf, vervalst, of gewoon een typo) of die (soft-)verwijderd is,
// stuurt terug naar het toolsoverzicht in plaats van een 404 of — erger —
// gewoon de data van dat bedrijf te tonen.
export const requireActiveTool = cache(async (toolId: string) => {
  const { user, company } = await requireActiveCompany();
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, companyId: company.id, deletedAt: null },
  });
  if (!tool) redirect("/dashboard/tools");
  return { user, company, tool };
});

// Levering B: het DRAFT-exemplaar van de CalculatorConfig van een tool —
// waar de builder altijd op bewerkt (nooit rechtstreeks op een PUBLISHED-
// of ARCHIVED-rij, zie CalculatorConfig in schema.prisma). Bestaat er nog
// geen, dan wordt er één aangemaakt: leeg voor een tool die de engine nog
// nooit heeft gebruikt, of een kopie van de huidige live (PUBLISHED)
// configuratie als die er al is — zo begint "verder bouwen aan een live
// tool" altijd bij wat de klant nu al ziet, nooit bij een lege configuratie.
// Geeft ook de company terug (net als requireActiveTool) zodat callers geen
// tweede round-trip nodig hebben.
export const requireDraftCalculatorConfig = cache(async (toolId: string) => {
  const { user, company, tool } = await requireActiveTool(toolId);

  const bestaandeDraft = await prisma.calculatorConfig.findFirst({
    where: { toolId, status: "DRAFT" },
    orderBy: { version: "desc" },
  });
  if (bestaandeDraft) return { user, company, tool, draft: bestaandeDraft };

  const gepubliceerd = tool.activeCalculatorConfigId
    ? await prisma.calculatorConfig.findUnique({ where: { id: tool.activeCalculatorConfigId } })
    : null;

  const hoogsteVersie = await prisma.calculatorConfig.aggregate({
    where: { toolId },
    _max: { version: true },
  });
  const volgendeVersie = (hoogsteVersie._max.version ?? 0) + 1;

  const draft = await prisma.calculatorConfig.create({
    data: {
      toolId,
      version: volgendeVersie,
      status: "DRAFT",
      config: (gepubliceerd ? gepubliceerd.config : legeCalculatorConfig()) as Prisma.InputJsonValue,
    },
  });
  return { user, company, tool, draft };
});

// Server-side afdwinging van maxActiveTools (zie PLAN_LIMITS in
// app/lib/subscription.ts) — nooit alleen in de UI verstoppen. Telt elke
// niet-verwijderde tool mee, ongeacht status (CONCEPT/GEPUBLICEERD/
// GEPAUZEERD tellen allemaal mee; alleen deletedAt telt niet mee).
export async function canCreateTool(companyId: string, tier: ReturnType<typeof effectiveTier>) {
  const limiet = PLAN_LIMITS[tier].maxActiveTools;
  if (limiet === null) return true;
  const aantal = await prisma.tool.count({ where: { companyId, deletedAt: null } });
  return aantal < limiet;
}

// Publiceren verandert het aantal actieve tools niet (een CONCEPT-tool telt
// al mee, zie canCreateTool hierboven) — dus bewust GEEN alias voor
// canCreateTool(): die telt "is er nog ruimte voor een extra tool" (aantal <
// limiet), terwijl de tool die hier gepubliceerd wordt zelf al meetelt in
// aantal. Met de strikte "<" van canCreateTool zou een Gratis-gebruiker met
// precies hun ene toegestane tool die tool nooit kunnen publiceren — hier dus
// "aantal <= limiet" (mag niet over de limiet heen, mag er wel gelijk aan
// zijn).
export async function canPublishTool(companyId: string, tier: ReturnType<typeof effectiveTier>) {
  const limiet = PLAN_LIMITS[tier].maxActiveTools;
  if (limiet === null) return true;
  const aantal = await prisma.tool.count({ where: { companyId, deletedAt: null } });
  return aantal <= limiet;
}

// Gedeelde include-vorm voor beide publieke routes hieronder — precies wat
// de calculator-renderer nodig heeft, niets meer (publieke, hoogfrequente
// route). Dekt zowel het bestaande, sjabloon-gedreven pad (Calculator in
// app/portaal/[slug]/calculator.tsx: branding/costSettings/products) als,
// sinds Levering B, het generieke-engine-pad (EngineCalculator in
// app/portaal/[slug]/engine-calculator.tsx: activeCalculatorConfig) — een
// Tool gebruikt precies één van de twee, zie welkeCalculatorVoorTool()
// hieronder.
const PUBLIEKE_TOOL_INCLUDE = {
  company: { include: { creator: { select: { email: true } } } },
  branding: true,
  costSettings: true,
  products: {
    where: { actief: true },
    orderBy: { order: "asc" as const },
    include: {
      materiaalCategorieen: {
        orderBy: { order: "asc" as const },
        include: { materialen: { where: { actief: true }, orderBy: { order: "asc" as const } } },
      },
      extraOpties: { where: { actief: true }, orderBy: { order: "asc" as const } },
    },
  },
  activeCalculatorConfig: true,
};

// Resolvet een Tool voor de canonieke publieke route
// (/t/[bedrijfsslug]/[toolslug]) — geen auth. Geeft bewust ook een
// niet-gepubliceerde tool terug (i.p.v. meteen null): de aanroepende pagina
// moet zelf onderscheid kunnen maken tussen "bestaat niet" (notFound) en
// "bestaat wel, maar is CONCEPT/GEPAUZEERD" (een nette statusmelding i.p.v.
// een kale 404 — zie ToolStatus in schema.prisma). Alleen (soft-)verwijderde
// tools zijn hier nooit bereikbaar.
export async function getToolForPublicRoute(bedrijfsSlug: string, toolSlug: string) {
  return prisma.tool.findFirst({
    where: {
      slug: toolSlug,
      deletedAt: null,
      company: { slug: bedrijfsSlug },
    },
    include: PUBLIEKE_TOOL_INCLUDE,
  });
}

// Legacy-compatibiliteit voor /portaal/[slug]: bestaande klanten kunnen deze
// URL al op hun eigen website of in een iframe hebben staan van vóór
// Levering A (multi-tool), toen een company nog maar één calculator had. In
// plaats van te redirecten (kan bestaande iframes breken) rendert deze route
// gewoon rechtstreeks de eerste gepubliceerde tool van dat bedrijf — zie
// app/portaal/[slug]/page.tsx.
export async function getLegacyToolForCompanySlug(companySlug: string) {
  const tool = await prisma.tool.findFirst({
    where: {
      status: "GEPUBLICEERD",
      deletedAt: null,
      company: { slug: companySlug },
    },
    orderBy: { order: "asc" },
    include: PUBLIEKE_TOOL_INCLUDE,
  });
  return tool;
}

// Voor /embed/[toolId] (zie Deel 26 van de opdracht) — laadt uitsluitend via
// het onraadbare cuid, nooit via company/bedrijfsslug, zodat een embedcode
// nooit per ongeluk een andere tool van hetzelfde bedrijf kan tonen. Geeft
// (net als getToolForPublicRoute) ook een niet-gepubliceerde tool terug, zo
// kan de embedpagina zelf de nette "niet beschikbaar"-status tonen i.p.v.
// een kale 404.
export async function getToolForEmbed(toolId: string) {
  return prisma.tool.findFirst({
    where: { id: toolId, deletedAt: null },
    include: PUBLIEKE_TOOL_INCLUDE,
  });
}

// Levering B: haalt de MaterialCategory/MaterialOption-opties op waar de
// PRODUCT_KEUZE-velden van een gepubliceerde CalculatorConfig naar
// verwijzen (Deel 11: hergebruikt bewust de bestaande materiaalstructuur
// i.p.v. een tweede productcatalogus). Scoped op `toolId` — een
// materialCategoryId die niet bij DEZE tool hoort (via zijn Product) komt
// nooit terug, ook niet als een (nooit via de builder-UI opgeslagen, maar
// theoretisch verzonnen) config ernaar zou verwijzen.
export async function getMateriaalOptiesVoorEngineVelden(toolId: string, materialCategoryIds: string[]) {
  if (materialCategoryIds.length === 0) return {};

  const categorieen = await prisma.materialCategory.findMany({
    where: { id: { in: materialCategoryIds }, product: { toolId } },
    include: { materialen: { where: { actief: true }, orderBy: { order: "asc" } } },
  });

  const resultaat: Record<string, { id: string; naam: string; prijs: number }[]> = {};
  for (const categorie of categorieen) {
    resultaat[categorie.id] = categorie.materialen.map((m) => ({ id: m.id, naam: m.naam, prijs: m.prijs }));
  }
  return resultaat;
}

export async function getArbeidStapEenheid(toolId: string) {
  const costSettings = await prisma.costSettings.findUnique({
    where: { toolId },
    select: { arbeidStapEenheid: true },
  });
  return costSettings?.arbeidStapEenheid ?? "UUR";
}

// Cost-settings fields de "Kosten"-sectie van het productformulier nodig
// heeft: wat de tool-standaardtarieven zijn (om te tonen als het product
// niet afwijkt) en waar de link naar Kosteninstellingen naartoe wijst. Geeft
// de EFFECTIEVE waarden terug (via resolveCostSettings — accounthoudt
// rekening met "Gebruik accountinstelling" per veld), nooit de kolomwaarden
// rechtstreeks.
export async function getProductPricingSettings(toolId: string, company: AccountDefaults) {
  const costSettings = await prisma.costSettings.findUnique({
    where: { toolId },
    select: {
      arbeidEnabled: true,
      arbeidStapEenheid: true,
      gebruiktAccountArbeidTarief: true,
      arbeidTariefUur: true,
      arbeidTariefDagdeel: true,
      arbeidTariefDag: true,
      arbeidAfronden: true,
      transportEnabled: true,
      transportTarief: true,
      voorrijEnabled: true,
      gebruiktAccountVoorrijTarief: true,
      voorrijTarief: true,
      materiaalEnabled: true,
      gebruiktAccountBtw: true,
      btwPercentage: true,
    },
  });
  const effectief = costSettings
    ? resolveCostSettings(costSettings, company)
    : {
        arbeidEnabled: true,
        arbeidStapEenheid: "UUR" as const,
        arbeidTariefUur: company.standaardArbeidTariefUur,
        arbeidTariefDagdeel: 180,
        arbeidTariefDag: 360,
        arbeidAfronden: false,
        transportEnabled: true,
        transportTarief: 0,
        voorrijEnabled: true,
        voorrijTarief: company.standaardVoorrijTarief,
        materiaalEnabled: true,
        btwPercentage: company.standaardBtwPercentage,
      };
  return effectief;
}
