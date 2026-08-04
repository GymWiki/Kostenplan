"use client";

import { useMemo } from "react";
import { Label } from "@/app/components/ui/input";
import { VeldInputEnkel, VeldenRenderer } from "./veld-form";
import {
  berekenHoeveelheidVoorSjabloon,
  coerceVeldWaarden,
  klantVeldenVoorSjabloon,
  parseGetal,
  type SjabloonVeld,
} from "@/app/lib/sjablonen";
import { berekenGestaffeldBedrag, type CalcProductStaffel } from "@/app/lib/calculate";
import { formatCurrency } from "@/app/lib/format";
import { unitLabel } from "@/app/lib/units";
import type { ProductSjabloon } from "@/app/generated/prisma/client";

// Rekent continu een voorbeeldbedrag uit op basis van demo-invoer die de
// vakman zelf mag aanpassen — bewust los van calculate.ts's volledige
// calculateBreakdown() (arbeid, materiaalcategorieën, ...): dit voorbeeld
// laat alleen zien wat "hoeveelheid × prijs per eenheid" (met eventuele
// staffels/minimumprijs) voor déze prijsinstelling oplevert, wat het enige
// is dat het sjabloon zelf bepaalt.
export function LiveVoorbeeld({
  sjabloon,
  sjabloonConfig,
  klantInvoer,
  onKlantInvoerChange,
  eenheid,
  prijsPerEenheid,
  staffels,
  minimumprijs,
}: {
  sjabloon: ProductSjabloon;
  sjabloonConfig: Record<string, unknown>;
  klantInvoer: Record<string, unknown>;
  onKlantInvoerChange: (key: string, waarde: unknown) => void;
  eenheid: string;
  prijsPerEenheid: string;
  staffels: CalcProductStaffel[];
  minimumprijs: string;
}) {
  const isEnkel = sjabloon === "ENKELE_HOEVEELHEID";
  const klantVelden = useMemo(
    () => (isEnkel ? [] : klantVeldenVoorSjabloon(sjabloon, sjabloonConfig)),
    [isEnkel, sjabloon, sjabloonConfig]
  );

  const { bedrag, samenvatting } = useMemo(() => {
    const prijs = parseGetal(prijsPerEenheid, 0);
    const min = minimumprijs.trim() === "" ? null : parseGetal(minimumprijs, 0);

    let totaal: number;
    let samenvatting: string;

    if (isEnkel) {
      const hoeveelheid = parseGetal(klantInvoer.hoeveelheid, 20);
      totaal =
        staffels.length > 0
          ? berekenGestaffeldBedrag(hoeveelheid, prijs, staffels)
          : hoeveelheid * prijs;
      samenvatting = `${hoeveelheid} ${unitLabel(eenheid)}`;
    } else {
      const gecoerceerdeInvoer = coerceVeldWaarden(klantVelden, klantInvoer);
      const resultaat = berekenHoeveelheidVoorSjabloon(sjabloon, sjabloonConfig, gecoerceerdeInvoer);
      if (resultaat.soort === "hoeveelheid") {
        totaal =
          staffels.length > 0
            ? berekenGestaffeldBedrag(resultaat.waarde, prijs, staffels)
            : resultaat.waarde * prijs;
      } else {
        totaal = resultaat.regels.reduce((som, regel) => som + regel.aantal * regel.prijsPerEenheid, 0);
      }
      samenvatting = samenvattingVanInvoer(klantVelden, gecoerceerdeInvoer);
    }

    if (min != null) totaal = Math.max(totaal, min);
    return { bedrag: totaal, samenvatting };
  }, [isEnkel, klantVelden, klantInvoer, sjabloon, sjabloonConfig, prijsPerEenheid, staffels, minimumprijs, eenheid]);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-primary/40 bg-primary/5 p-4">
      <p className="text-sm font-medium text-foreground">Live voorbeeld</p>

      {isEnkel ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="voorbeeld-hoeveelheid">Hoeveelheid ({unitLabel(eenheid)})</Label>
          <VeldInputEnkel
            id="voorbeeld-hoeveelheid"
            veld={{ key: "hoeveelheid", soort: "getal", label: "Hoeveelheid" }}
            waarde={klantInvoer.hoeveelheid ?? "20"}
            onChange={(w) => onKlantInvoerChange("hoeveelheid", w)}
          />
        </div>
      ) : (
        klantVelden.length > 0 && (
          <VeldenRenderer
            velden={klantVelden}
            waarden={klantInvoer}
            onChange={onKlantInvoerChange}
            idPrefix="voorbeeld"
          />
        )
      )}

      <p className="text-sm text-foreground">
        {samenvatting ? `${samenvatting} komt uit op ` : "Dat komt uit op "}
        <span className="font-semibold">{formatCurrency(bedrag)}</span>.
      </p>
    </div>
  );
}

function samenvattingVanInvoer(velden: SjabloonVeld[], invoer: Record<string, unknown>): string {
  const delen: string[] = [];
  for (const veld of velden) {
    if (veld.soort === "getal") {
      const waarde = invoer[veld.key];
      if (typeof waarde === "number" && waarde > 0) {
        delen.push(`${waarde}${veld.eenheid ? " " + veld.eenheid : ""}`);
      }
    } else if (veld.soort === "regelgroep") {
      const regels = Array.isArray(invoer[veld.key]) ? (invoer[veld.key] as unknown[]) : [];
      if (regels.length > 0) {
        delen.push(`${regels.length} ${regels.length === 1 ? "regel" : "regels"}`);
      }
    }
  }
  return delen.join(" × ");
}
