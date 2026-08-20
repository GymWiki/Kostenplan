import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolForEmbed } from "@/app/lib/dal";
import { resolveCostSettings } from "@/app/lib/tools";
import { effectiveTier } from "@/app/lib/subscription";
import { Calculator } from "@/app/portaal/[slug]/calculator";

export const metadata: Metadata = {
  title: "Rekentool",
  // Nooit indexeren — dit is uitsluitend bedoeld om in een iframe op de
  // website van de vakman te draaien, niet als losstaande, doorzoekbare
  // pagina.
  robots: { index: false, follow: false },
};

// Uitsluitend voor insluiten (zie Deel 26 van de opdracht): laadt één
// specifieke tool via zijn cuid — nooit een company/bedrijfsslug — zodat de
// embedcode van Tool A onmogelijk Tool B van hetzelfde bedrijf kan tonen.
// Gebruikt dezelfde <Calculator>-renderer als de publieke pagina en de
// dashboard-preview (zie Deel 33 van de opdracht): geen aparte
// berekeningslogica.
export default async function EmbedPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;

  const tool = await getToolForEmbed(toolId);
  if (!tool || !tool.costSettings) notFound();

  if (tool.status !== "GEPUBLICEERD") {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 bg-background px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">Deze rekentool is tijdelijk niet beschikbaar</p>
        <p className="text-xs text-muted-foreground">Neem contact op met {tool.company.naam}.</p>
      </div>
    );
  }

  const effectieveCostSettings = resolveCostSettings(tool.costSettings, tool.company);

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
