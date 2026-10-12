import type { LeadSnapshot, LeadSnapshotLine, LeadSnapshotOpbouw } from "@/app/lib/leads";
import { totaalTopCenten } from "@/app/lib/pricing/weergave";
import { hashConfig } from "@/app/lib/pricing/hash";
import type { OnderdeelUitkomst, PricingResult } from "@/app/lib/pricing/engine";
import type { PricingConfig, PricingInput } from "@/app/lib/pricing/schema";

const euro = (c: number) => c / 100;

// De uitsplitsing per onderdeel in de oude vorm van de snapshot (euro's), voor schermen en
// offerte-code die daar nog van uitgaan. De bron is altijd de rekenkern.
function opbouwVan(o: OnderdeelUitkomst): LeadSnapshotOpbouw {
  const arbeid = o.regels.find((r) => r.soort === "arbeid");
  const transport = o.regels.find((r) => r.soort === "transport");
  const voorrij = o.regels.find((r) => r.soort === "voorrijkosten");
  const artikelen = o.regels.filter((r) => r.soort === "artikel").reduce((s, r) => s + r.bedragExclCenten, 0);
  return {
    materiaal: o.regels.filter((r) => r.soort === "materiaal").map((m) => ({ naam: m.omschrijving, hoeveelheid: m.aantal, eenheid: o.eenheid, prijsPerEenheid: euro(m.prijsPerEenheidCenten), bedrag: euro(m.bedragExclCenten) })),
    artikelen: artikelen > 0 ? { bedrag: euro(artikelen) } : undefined,
    arbeid: arbeid ? { tijd: arbeid.aantal, eenheid: arbeid.eenheid === "uur" ? "uur" : arbeid.eenheid === "dag" ? "dag" : "dagdeel", tarief: euro(arbeid.prijsPerEenheidCenten), bedrag: euro(arbeid.bedragExclCenten) } : undefined,
    transport: transport ? { bedrag: euro(transport.bedragExclCenten), meeschalend: transport.eenheid !== "post", dagen: transport.eenheid === "dag" ? transport.aantal : undefined } : undefined,
    voorrijkosten: voorrij ? { bedrag: euro(voorrij.bedragExclCenten), meeschalend: voorrij.eenheid !== "post" } : undefined,
    extras: o.regels.filter((r) => r.soort === "extra").map((e) => ({ naam: e.omschrijving, aantal: e.aantal, bedrag: euro(e.bedragExclCenten) })),
  };
}

// Bevroren "wat had de klant aangevinkt" voor de leads-CRM en de offerte. Gebouwd uit het resultaat van
// de rekenkern: de browser bouwt hem met dezelfde functie als de server (die opnieuw rekent).
export function bouwLeadSnapshot({
  config,
  invoer,
  resultaat,
  bron = "client",
  afwijking,
}: {
  config: PricingConfig;
  invoer: PricingInput;
  resultaat: PricingResult;
  bron?: "server" | "client";
  afwijking?: { klantCenten: number; serverCenten: number };
}): LeadSnapshot {
  const regels: LeadSnapshotLine[] = resultaat.onderdelen.map((o) => {
    const materiaal = o.regels.filter((r) => r.soort === "materiaal").map((r) => r.omschrijving);
    // De kern geeft alleen gekozen extra's en toeslagen terug, dus elke extra-regel telt.
    const extras = o.regels.filter((r) => r.soort === "extra").map((r) => r.omschrijving);
    return {
      productId: o.id,
      naam: o.naam,
      type: "product" as const,
      aantal: o.hoeveelheid,
      eenheid: o.eenheid,
      materiaal: materiaal.length > 0 ? materiaal.join(", ") : undefined,
      extras: extras.length > 0 ? extras : undefined,
      prijs: euro(o.subtotaalExclCenten),
      opbouw: opbouwVan(o),
    };
  });
  const top = resultaat.bandbreedte?.max;
  return {
    regels,
    arbeidskosten: euro(top ? top.kosten.arbeid : resultaat.kosten.arbeid),
    materiaalkosten: euro(top ? top.kosten.materiaal + top.kosten.extra + top.kosten.artikel : resultaat.kosten.materiaal + resultaat.kosten.extra + resultaat.kosten.artikel),
    transportkosten: euro(top ? top.kosten.transport : resultaat.kosten.transport),
    voorrijkosten: euro(top ? top.kosten.voorrijkosten : resultaat.kosten.voorrijkosten),
    subtotaal: euro(top ? top.subtotaalExclCenten : resultaat.subtotaalExclCenten),
    btw: euro(top ? top.btwCenten : resultaat.btwCenten),
    totaal: euro(totaalTopCenten(resultaat)),
    btwPercentage: config.tarieven.btwPercentage,
    bandbreedte: resultaat.bandbreedte ? true : undefined,
    rekenkern: { versie: 1, bron, configHash: hashConfig(config), invoer, resultaat, afwijking },
  };
}
