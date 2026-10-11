import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VoorbeeldClient } from "@/app/voorbeeld/[toolId]/voorbeeld-client";
import { bouwDemoDraft, demoToestand, STIJLEN, STIJL_IDS, type StijlId } from "@/app/lib/landing/demo-data";
import { GAST_TOOL_ID } from "@/app/lib/draft-editor";

export const metadata: Metadata = { title: "Voorbeeld van een rekentool", robots: { index: false, follow: false } };

export function generateStaticParams() {
  return STIJL_IDS.map((stijl) => ({ stijl }));
}

// De echte klant-rekentool in de huisstijl van een fictief hoveniersbedrijf,
// voor de iframes op de landingspagina. Statisch gerenderd (dus ook zonder
// JavaScript ingevuld) en zonder database: de tekst komt uit de presets.
export default async function DemoRekentoolPage({ params }: { params: Promise<{ stijl: string }> }) {
  const { stijl: id } = await params;
  const stijl = STIJLEN[id as StijlId];
  if (!stijl) notFound();
  const draft = bouwDemoDraft(stijl);
  const t = demoToestand(draft, stijl);
  return (
    <VoorbeeldClient
      toolId={GAST_TOOL_ID}
      bedrijfsnaam={draft.company.name}
      email=""
      subscriptionTier={stijl.tier}
      initieel={{ products: t.products, branding: t.branding, costSettings: t.costSettings, toelichting: null, ctaTekst: null, vraagTelefoon: false }}
      engine={null}
      startModus="uitproberen"
    />
  );
}
