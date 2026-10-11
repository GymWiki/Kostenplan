import type { Metadata } from "next";
import { after } from "next/server";
import { notFound } from "next/navigation";
import { getToolForEmbed, getMateriaalOptiesVoorEngineVelden } from "@/app/lib/dal";
import { alleVeldenVanConfig, parseCalculatorConfig, publicCalculatorConfig } from "@/app/lib/calculator-engine";
import { bouwSnapshotInhoud, maakSnapshot } from "@/app/lib/snapshot/bouw";
import { blobGeconfigureerd, leesSnapshot } from "@/app/lib/snapshot/opslag";
import type { MateriaalOpties, RekentoolSnapshot } from "@/app/lib/snapshot/types";
import { SnapshotWeergave } from "./snapshot-weergave";

export const metadata: Metadata = {
  title: "Rekentool",
  // Nooit indexeren — dit is uitsluitend bedoeld om in een iframe op de
  // website van de vakman te draaien, niet als losstaande, doorzoekbare
  // pagina.
  robots: { index: false, follow: false },
};

// De pagina zelf wordt een minuut gecachet (en direct ververst als de hovenier
// iets publiceert, zie publiceerTool). Valt de database of de opslag weg, dan
// blijft de laatst gerenderde versie gewoon beschikbaar.
export const revalidate = 60;

function NietBeschikbaar({ naam }: { naam: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 bg-background px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">Deze rekentool is tijdelijk niet beschikbaar</p>
      <p className="text-xs text-muted-foreground">Neem contact op met {naam}.</p>
    </div>
  );
}

// Terugval als er nog geen snapshot is (nieuwe tool, opslag nog niet
// ingesteld, of nog niet gepubliceerd): lees uit de database en bouw dezelfde
// snapshot-vorm, zodat er maar één weergavepad is.
async function snapshotUitDatabase(toolId: string): Promise<RekentoolSnapshot | "bestaat-niet"> {
  const tool = await getToolForEmbed(toolId);
  if (!tool) return "bestaat-niet";
  let materiaalOpties: MateriaalOpties = {};
  if (tool.activeCalculatorConfig) {
    const config = publicCalculatorConfig(parseCalculatorConfig(tool.activeCalculatorConfig.config));
    const ids = alleVeldenVanConfig(config)
      .filter((veld) => veld.soort === "PRODUCT_KEUZE")
      .map((veld) => veld.materialCategoryId);
    materiaalOpties = await getMateriaalOptiesVoorEngineVelden(tool.id, ids);
  }
  return maakSnapshot(bouwSnapshotInhoud(tool, materiaalOpties), tool.snapshotVersie, new Date());
}

// Uitsluitend voor insluiten (zie Deel 26 van de opdracht): laadt één
// specifieke tool via zijn cuid — nooit een company/bedrijfsslug — zodat de
// embedcode van Tool A onmogelijk Tool B van hetzelfde bedrijf kan tonen.
//
// Bron: de gepubliceerde snapshot (Blob, dan Cloudflare-spiegel). De database
// wordt alleen gelezen als er (nog) geen snapshot is. Lukt niets, dan gooien
// we bewust een fout: Next blijft dan de laatst geslaagde pagina tonen, en het
// laadscript op de site toont anders de contactkaart.
export default async function EmbedPage({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;

  const uitSnapshot = blobGeconfigureerd() || process.env.SNAPSHOT_MIRROR_URL ? await leesSnapshot(toolId) : null;
  let snapshot: RekentoolSnapshot | null = uitSnapshot?.snapshot ?? null;

  if (!snapshot) {
    const uitDb = await snapshotUitDatabase(toolId);
    if (uitDb === "bestaat-niet") notFound();
    snapshot = uitDb;
    if (blobGeconfigureerd()) {
      // Nog geen snapshot: maak hem nu alvast, buiten dit verzoek om.
      after(async () => {
        const { publiceerMetHerhaling } = await import("@/app/lib/snapshot/publiceer");
        await publiceerMetHerhaling(toolId);
      });
    }
  }

  if (!snapshot.beschikbaar) return <NietBeschikbaar naam={snapshot.bedrijf.naam} />;
  return <SnapshotWeergave snapshot={snapshot} />;
}
