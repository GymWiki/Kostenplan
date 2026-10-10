import type { Metadata } from "next";
import { VoorbeeldClient } from "@/app/voorbeeld/[toolId]/voorbeeld-client";
import { draftNaarBranding, draftNaarKosten, GAST_TOOL_ID, maakDraft } from "@/app/lib/draft-editor";

export const metadata: Metadata = { title: "Voorbeeld", robots: { index: false, follow: false } };

// De klant-rekentool voor de gast-editor (in een iframe). Geen database en geen
// inlog: alles wat hij toont (onderdelen, huisstijl, tarieven) komt live van de
// editor via postMessage. Dit is alleen de lege startstand.
export default function GastVoorbeeldPage() {
  const start = maakDraft({ presetIds: [], tarief: 45 });
  return (
    <VoorbeeldClient
      toolId={GAST_TOOL_ID}
      bedrijfsnaam={start.company.name}
      email=""
      subscriptionTier="GRATIS"
      initieel={{
        products: [],
        branding: draftNaarBranding(start),
        costSettings: draftNaarKosten(start),
        toelichting: null,
        ctaTekst: null,
        vraagTelefoon: false,
      }}
      engine={null}
    />
  );
}
