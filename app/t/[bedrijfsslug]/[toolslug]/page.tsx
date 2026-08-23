import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PauseCircle } from "lucide-react";
import { getToolForPublicRoute, getMateriaalOptiesVoorEngineVelden } from "@/app/lib/dal";
import { resolveCostSettings } from "@/app/lib/tools";
import { effectiveTier } from "@/app/lib/subscription";
import { parseCalculatorConfig, publicCalculatorConfig, alleVeldenVanConfig } from "@/app/lib/calculator-engine";
import { Logo } from "@/app/components/ui/logo";
import { Calculator } from "@/app/portaal/[slug]/calculator";
import { EngineCalculator } from "@/app/portaal/[slug]/engine-calculator";

// Cached per request: generateMetadata() en de paginacomponent hieronder
// worden apart door Next.js aangeroepen en zouden anders allebei Postgres
// raken voor dezelfde tool — op de publieke, ongeauthenticeerde route met
// het meeste verkeer in de hele app. cache() laat ze één fetch delen.
const getPublicTool = cache(getToolForPublicRoute);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bedrijfsslug: string; toolslug: string }>;
}): Promise<Metadata> {
  const { bedrijfsslug, toolslug } = await params;
  const tool = await getPublicTool(bedrijfsslug, toolslug);
  if (!tool) return { title: "Kostencalculator" };

  const title = `${tool.naam} — ${tool.company.naam}`;
  const description = `Bereken direct een schatting van de kosten voor jouw project bij ${tool.company.naam}.`;
  const canonical = `/t/${bedrijfsslug}/${toolslug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Kostenplan",
      locale: "nl_NL",
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

// De canonieke publieke URL van een rekentool sinds Levering A (multi-tool):
// /t/[bedrijfsslug]/[toolslug]. Bevat geen accountselectie — de combinatie
// van beide slugs identificeert de tool volledig op zichzelf.
export default async function ToolPage({
  params,
}: {
  params: Promise<{ bedrijfsslug: string; toolslug: string }>;
}) {
  const { bedrijfsslug, toolslug } = await params;

  const tool = await getPublicTool(bedrijfsslug, toolslug);
  if (!tool || !tool.costSettings) notFound();

  // CONCEPT/GEPAUZEERD bestaan wél (dus geen kale 404), maar zijn niet
  // publiek te gebruiken — zie ToolStatus in schema.prisma.
  if (tool.status !== "GEPUBLICEERD") {
    return <ToolNietBeschikbaar bedrijfsnaam={tool.company.naam} />;
  }

  const effectieveCostSettings = resolveCostSettings(tool.costSettings, tool.company);

  // Levering B: een tool met een gepubliceerde CalculatorConfig gebruikt de
  // generieke engine; een tool zonder (elke tool van vóór Levering B, en
  // elke nieuwe tool totdat de vakman 'm expliciet publiceert) blijft
  // ongewijzigd op het bestaande, sjabloon-gedreven pad draaien (Deel 20/31
  // — geen breaking change). Geen aparte pagina/route voor het één of het
  // ander: dezelfde /t/-pagina bedient beide, precies zoals de opdracht
  // vraagt ("geen aparte calculatorlogica").
  if (tool.activeCalculatorConfig) {
    const config = publicCalculatorConfig(parseCalculatorConfig(tool.activeCalculatorConfig.config));
    const materialCategoryIds = alleVeldenVanConfig(config)
      .filter((veld) => veld.soort === "PRODUCT_KEUZE")
      .map((veld) => veld.materialCategoryId);
    const materiaalOpties = await getMateriaalOptiesVoorEngineVelden(tool.id, materialCategoryIds);
    return (
      <EngineCalculator
        toolId={tool.id}
        bedrijfsnaam={tool.company.naam}
        email={tool.company.creator.email}
        subscriptionTier={effectiveTier(tool.company)}
        branding={tool.branding}
        config={config}
        btwPercentage={effectieveCostSettings.btwPercentage}
        materiaalOpties={materiaalOpties}
      />
    );
  }

  return (
    <Calculator
      toolId={tool.id}
      bedrijfsnaam={tool.company.naam}
      email={tool.company.creator.email}
      subscriptionTier={effectiveTier(tool.company)}
      branding={tool.branding}
      costSettings={effectieveCostSettings}
      products={tool.products}
    />
  );
}

function ToolNietBeschikbaar({ bedrijfsnaam }: { bedrijfsnaam: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-12 text-center">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Logo />
        Kostenplan
      </Link>
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <PauseCircle className="h-6 w-6" />
        </span>
        <div>
          <p className="text-lg font-semibold text-foreground">Deze rekentool is tijdelijk niet beschikbaar</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Neem contact op met {bedrijfsnaam} voor een prijsindicatie.
          </p>
        </div>
      </div>
    </div>
  );
}
