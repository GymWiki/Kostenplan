"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, type ProductWithDetails } from "@/app/portaal/[slug]/calculator";
import { EngineCalculator } from "@/app/portaal/[slug]/engine-calculator";
import { Bewerkbaar, EditorProvider, type EditorHaken, type Waarschuwing } from "@/app/portaal/[slug]/bewerkbaar";
import type { WerkgebiedInstellingen } from "@/app/lib/werkgebied/schema";
import type { AnyCalculatorConfigData } from "@/app/lib/calculator-engine";
import type { Branding, CostSettings, SubscriptionTier } from "@/app/generated/prisma/client";

// Berichten tussen de editor (parent) en deze pagina (iframe). Zelfde origin.
export type NaarVoorbeeld = {
  type: "kp:state";
  products: ProductWithDetails[];
  branding: Branding | null;
  costSettings: CostSettings;
  modus: "bewerken" | "uitproberen";
  geselecteerd: string | null;
  waarschuwingen: Record<string, Waarschuwing>;
  toelichting: string | null;
  ctaTekst: string | null;
  vraagTelefoon: boolean;
  // Alleen de gast-flow: de bedrijfsnaam verandert daar tijdens het bewerken.
  bedrijfsnaam?: string;
};
export type VanVoorbeeld =
  | { type: "kp:ready" }
  | { type: "kp:select"; doel: string }
  | { type: "kp:verplaats"; doel: string; richting: -1 | 1 }
  | { type: "kp:sleep"; van: string; naar: string }
  | { type: "kp:toevoegen" };

type Initieel = {
  products: ProductWithDetails[];
  branding: Branding | null;
  costSettings: CostSettings;
  toelichting: string | null;
  ctaTekst: string | null;
  vraagTelefoon: boolean;
  // Werkgebied en minimum zoals voor deze rekentool geldt (alleen als aan).
  werkgebied?: WerkgebiedInstellingen | null;
};

function stuur(bericht: VanVoorbeeld) {
  window.parent.postMessage(bericht, window.location.origin);
}

export function VoorbeeldClient({
  toolId,
  bedrijfsnaam: startNaam,
  email,
  subscriptionTier,
  initieel,
  engine,
  startModus = "bewerken",
}: {
  toolId: string;
  bedrijfsnaam: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  initieel: Initieel;
  engine: { config: AnyCalculatorConfigData; materiaalOpties: React.ComponentProps<typeof EngineCalculator>["materiaalOpties"] } | null;
  // De landingspagina toont de rekentool direct als klant (zonder bewerkranden).
  startModus?: "bewerken" | "uitproberen";
}) {
  const [data, setData] = useState<Initieel>(initieel);
  const [bedrijfsnaam, setBedrijfsnaam] = useState(startNaam);
  const [modus, setModus] = useState<"bewerken" | "uitproberen">(startModus);
  const [geselecteerd, setGeselecteerd] = useState<string | null>(null);
  const [waarschuwingen, setWaarschuwingen] = useState<Record<string, Waarschuwing>>({});

  useEffect(() => {
    function ontvang(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const m = e.data as NaarVoorbeeld;
      if (m?.type !== "kp:state") return;
      setData({
        products: m.products,
        branding: m.branding,
        costSettings: m.costSettings,
        toelichting: m.toelichting,
        ctaTekst: m.ctaTekst,
        vraagTelefoon: m.vraagTelefoon,
      });
      if (m.bedrijfsnaam) setBedrijfsnaam(m.bedrijfsnaam);
      setModus(m.modus);
      setGeselecteerd(m.geselecteerd);
      setWaarschuwingen(m.waarschuwingen);
    }
    window.addEventListener("message", ontvang);
    // De editor kan nog aan het laden zijn: blijf "klaar" melden tot er een
    // eerste state binnenkomt.
    let ontvangen = false;
    const markeer = (e: MessageEvent) => {
      if (e.source === window.parent && (e.data as NaarVoorbeeld)?.type === "kp:state") ontvangen = true;
    };
    window.addEventListener("message", markeer);
    let poging = 0;
    const timer = window.setInterval(() => {
      if (ontvangen || window.parent === window || ++poging > 40) return window.clearInterval(timer);
      stuur({ type: "kp:ready" });
    }, 250);
    if (window.parent !== window) stuur({ type: "kp:ready" });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("message", ontvang);
      window.removeEventListener("message", markeer);
    };
  }, []);

  const actieve = useMemo(() => data.products.filter((p) => p.actief), [data.products]);

  const haak: EditorHaken = useMemo(
    () => ({
      modus,
      geselecteerd,
      waarschuwingen,
      volgorde: actieve.map((p) => `werkzaamheid:${p.id}`),
      onSelecteer: (doel) => stuur({ type: "kp:select", doel }),
      onVerplaats: (doel, richting) => stuur({ type: "kp:verplaats", doel, richting }),
      onSleep: (van, naar) => stuur({ type: "kp:sleep", van, naar }),
      onToevoegen: () => stuur({ type: "kp:toevoegen" }),
    }),
    [modus, geselecteerd, waarschuwingen, actieve]
  );

  if (engine) {
    return (
      <EditorProvider haak={haak}>
        <Bewerkbaar doel="aangepast" label="Aangepaste rekentool">
          <EngineCalculator
            toolId={toolId}
            bedrijfsnaam={bedrijfsnaam}
            email={email}
            subscriptionTier={subscriptionTier}
            branding={data.branding}
            config={engine.config}
            btwPercentage={data.costSettings.btwPercentage}
            materiaalOpties={engine.materiaalOpties}
            previewModus
          />
        </Bewerkbaar>
      </EditorProvider>
    );
  }

  return (
    <Calculator
      key={actieve.map((p) => p.id).join(",") === "" ? "leeg" : "gevuld"}
      toolId={toolId}
      bedrijfsnaam={bedrijfsnaam}
      email={email}
      subscriptionTier={subscriptionTier}
      branding={data.branding}
      costSettings={data.costSettings}
      products={actieve}
      editor={haak}
      toelichting={data.toelichting}
      ctaTekst={data.ctaTekst}
      vraagTelefoon={data.vraagTelefoon}
      werkgebied={initieel.werkgebied ?? null}
    />
  );
}
