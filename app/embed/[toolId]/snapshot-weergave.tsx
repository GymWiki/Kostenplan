import { Calculator } from "@/app/portaal/[slug]/calculator";
import { EngineCalculator } from "@/app/portaal/[slug]/engine-calculator";
import type { RekentoolSnapshot } from "@/app/lib/snapshot/types";
import { EmbedSignaal } from "./embed-signaal";

// Eén weergave voor zowel de gepubliceerde snapshot als de database-fallback:
// beide gaan door dezelfde bouwfunctie, dus de rekentool is gelijk.
export function SnapshotWeergave({ snapshot }: { snapshot: RekentoolSnapshot }) {
  const email = snapshot.bedrijf.email ?? "";
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
          products={snapshot.producten}
          toelichting={snapshot.toelichting}
          ctaTekst={snapshot.ctaTekst}
          vraagTelefoon={snapshot.vraagTelefoon}
          werkgebied={snapshot.werkgebied ?? null}
        />
      )}
    </>
  );
}
