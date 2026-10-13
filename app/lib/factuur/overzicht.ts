import { prisma } from "@/app/lib/prisma";
import { bouwVoortgang } from "@/app/lib/lead-voortgang";

// Tellers en meldingen voor Overzicht: wat nog gefactureerd moet worden, wat openstaat en wat te laat is.
// Alles wordt bij het openen van de pagina afgeleid (Europe/Amsterdam); er is geen achtergrondtaak.
export type FactuurTeller = { aantal: number; totaalCenten: number };
export type FactuurTip = { leadId: string; factuurId: string; naam: string; nummer: string; dagenTeLaat: number; openstaandCenten: number };
export type FactuurOverzichtData = { teFactureren: FactuurTeller; openstaand: FactuurTeller; teLaat: FactuurTeller; tips: FactuurTip[] };

export const LEEG_FACTUUR_OVERZICHT: FactuurOverzichtData = { teFactureren: { aantal: 0, totaalCenten: 0 }, openstaand: { aantal: 0, totaalCenten: 0 }, teLaat: { aantal: 0, totaalCenten: 0 }, tips: [] };

export async function laadFactuurOverzicht(companyId: string, nu: Date = new Date()): Promise<FactuurOverzichtData> {
  const leads = await prisma.lead.findMany({
    where: { companyId, OR: [{ offertesV2: { some: { status: "GEACCEPTEERD" } } }, { facturen: { some: { status: { not: "CONCEPT" } } } }] },
    take: 500,
    select: {
      id: true,
      naam: true,
      createdAt: true,
      status: true,
      inContactOp: true,
      ingeplandStartweek: true,
      opgeleverdOp: true,
      verlorenReden: true,
      offertesV2: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, geldigTot: true, versies: { orderBy: { versie: "desc" }, take: 1, select: { totaalInclCenten: true } } } },
      facturen: {
        select: { id: true, nummer: true, type: true, status: true, totaalInclCenten: true, vervaldatum: true, inhoud: true, betalingen: { select: { bedragCenten: true } }, creditnotas: { select: { status: true, totaalInclCenten: true } } },
      },
    },
  });
  const uit: FactuurOverzichtData = { teFactureren: { aantal: 0, totaalCenten: 0 }, openstaand: { aantal: 0, totaalCenten: 0 }, teLaat: { aantal: 0, totaalCenten: 0 }, tips: [] };
  for (const l of leads) {
    const v = bouwVoortgang({ ...l, gebeurtenissen: [] }, nu);
    if (v.fase === "verloren") continue;
    if (v.teFactureren) {
      const gefactureerd = v.facturen.filter((f) => f.status !== "CONCEPT" && f.soort !== "creditnota").reduce((s, f) => s + f.totaalInclCenten, 0);
      uit.teFactureren.aantal += 1;
      uit.teFactureren.totaalCenten += Math.max(0, (l.offertesV2[0]?.versies[0]?.totaalInclCenten ?? 0) - gefactureerd);
    }
    if (v.openstaandCenten > 0) {
      uit.openstaand.aantal += 1;
      uit.openstaand.totaalCenten += v.openstaandCenten;
    }
    if (v.teLaatDagen && v.aandachtFactuurId) {
      uit.teLaat.aantal += 1;
      uit.teLaat.totaalCenten += v.teLaatCenten;
      const f = v.facturen.find((x) => x.id === v.aandachtFactuurId);
      uit.tips.push({ leadId: l.id, factuurId: v.aandachtFactuurId, naam: l.naam, nummer: f?.nummer ?? "", dagenTeLaat: v.teLaatDagen, openstaandCenten: v.teLaatCenten });
    }
  }
  uit.tips.sort((a, b) => b.dagenTeLaat - a.dagenTeLaat);
  uit.tips = uit.tips.slice(0, 5);
  return uit;
}
