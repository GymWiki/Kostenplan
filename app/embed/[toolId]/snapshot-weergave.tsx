import { Calculator } from "@/app/portaal/[slug]/calculator";
import { EngineCalculator } from "@/app/portaal/[slug]/engine-calculator";
import type { RekentoolSnapshot } from "@/app/lib/snapshot/types";
import { STANDAARD_WEERGAVE_CONFIG } from "@/app/lib/weergave/config";
import type { EmbedParams } from "@/app/lib/weergave/embed-opties";
import { EmbedSignaal } from "./embed-signaal";

// Eén weergave voor zowel de gepubliceerde snapshot als de database-fallback:
// beide gaan door dezelfde bouwfunctie, dus de rekentool is gelijk.
export function SnapshotWeergave({ snapshot, opties }: { snapshot: RekentoolSnapshot; opties?: EmbedParams }) {
  const email = snapshot.bedrijf.email ?? "";
  // De instellingen van de rekentool, met daarbovenop wat de embed-code van deze plek vraagt.
  const weergave = { ...(snapshot.weergave ?? STANDAARD_WEERGAVE_CONFIG), ...(opties?.weergave ? { weergave: opties.weergave } : {}) };
  const producten = opties?.onderdelen ? snapshot.producten.filter((p) => opties.onderdelen!.includes(p.id)) : snapshot.producten;
  return (
    <>
      <EmbedSignaal toolId={snapshot.toolId} />
      {snapshot.engine ? (
        <EngineCalculator
          toolId={snapshot.toolId}
          bedrijfsnaam={snapshot.bedrijf.naam}
          email={email}
          subscriptionTier={snapshot.tier}
          branding={snapshot.branding}
          config={snapshot.engine.config}
          btwPercentage={snapshot.costSettings.btwPercentage}
          materiaalOpties={snapshot.engine.materiaalOpties}
        />
      ) : (
        <Calculator
          toolId={snapshot.toolId}
          bedrijfsnaam={snapshot.bedrijf.naam}
          email={email}
          subscriptionTier={snapshot.tier}
          branding={snapshot.branding}
          costSettings={snapshot.costSettings}
          products={producten}
          toelichting={snapshot.toelichting}
          ctaTekst={snapshot.ctaTekst}
          vraagTelefoon={snapshot.vraagTelefoon}
          werkgebied={snapshot.werkgebied ?? null}
          weergave={weergave}
          openSleutel={opties?.open ?? null}
          popup={opties?.popup ?? false}
        />
      )}
    </>
  );
}
