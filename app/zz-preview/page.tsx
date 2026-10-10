import { adminFontClasses } from "@/app/lib/admin-fonts";
import { WerkzaamheidEditor } from "@/app/dashboard/tools/[toolId]/producten/editor/werkzaamheid-editor";
import { TarievenProvider } from "@/app/dashboard/tools/[toolId]/tarieven-context";
import type { ProductMetRelaties } from "@/app/lib/werkzaamheid";
import type { CostSettings } from "@/app/generated/prisma/client";

const nu = new Date(0);
const opt = (id: string, naam: string, prijs: number, extra: object = {}) => ({ id, materialCategoryId: "c1", naam, prijs, prijsType: "VAST", prijsMin: null, prijsMax: null, stapgrootte: null, productiviteitOverride: null, foto: null, actief: true, isVoorbeeld: false, order: 0, createdAt: nu, ...extra });
const product = {
  id: "p1", toolId: "t1", naam: "Schutting", omschrijving: null, eenheid: "m1", productiviteit: 6, arbeidTariefOverride: null, transportkostenOverride: null, transportMeeschalend: false, transportPerDag: false, voorrijkostenOverride: null, voorrijMeeschalend: false, icoon: "Fence", actief: true, order: 0, sjabloon: "ENKELE_HOEVEELHEID", sjabloonConfig: {}, createdAt: nu, updatedAt: nu,
  materiaalCategorieen: [{ id: "c1", productId: "p1", naam: "Materiaal", order: 0, verplicht: true, createdAt: nu, materialen: [opt("m1","Grenen schermen 180 cm",38,{isVoorbeeld:true}), opt("m2","Hardhouten planken",62), opt("m3","Betonschutting met hout",55)] }],
  extraOpties: [],
} as unknown as ProductMetRelaties;
const cs = { id: "x", toolId: "t1", arbeidEnabled: true, arbeidZichtbaar: true, arbeidStapEenheid: "DAGDEEL", gebruiktAccountArbeidTarief: false, arbeidTariefUur: 45, arbeidTariefDagdeel: 240, arbeidTariefDag: 480, arbeidAfronden: false, transportEnabled: true, transportZichtbaar: true, transportTarief: 65, voorrijEnabled: true, voorrijZichtbaar: true, gebruiktAccountVoorrijTarief: false, voorrijTarief: 45, materiaalEnabled: true, materiaalZichtbaar: true, gebruiktAccountBtw: false, btwPercentage: 21, bandbreedteModus: "GEEN", bandbreedteMargeOmlaag: 10, bandbreedteMargeOmhoog: 10, updatedAt: nu } as unknown as CostSettings;
export default function P() {
  return (
    <div data-admin-theme className={`min-h-screen bg-background px-4 py-6 md:px-8 ${adminFontClasses}`}>
      <div className="mx-auto max-w-[1200px]">
        <TarievenProvider toolId="t1" costSettings={cs}>
          <WerkzaamheidEditor toolId="t1" product={product} branding={null} subscriptionTier="GRATIS" extraOptiesSectie={<p className="text-sm">[extra opties]</p>} />
        </TarievenProvider>
      </div>
    </div>
  );
}
