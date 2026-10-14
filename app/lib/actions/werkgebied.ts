"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { zoekPostcodeHuisnummer } from "@/app/lib/werkgebied/pdok";
import { valideerInstellingen } from "@/app/lib/werkgebied/valideer";
import type { WerkgebiedInstellingen } from "@/app/lib/werkgebied/schema";

export type WerkgebiedResultaat = { ok: true; instellingen: WerkgebiedInstellingen } | { ok: false; error: string };

export type WerkgebiedBereik = { soort: "bedrijf" } | { soort: "tool"; toolId: string; overnemen: boolean };

// Slaat het werkgebied en de minimale opdracht op, voor het bedrijf of (met eigen instelling) voor één rekentool.
// Het startadres wordt hier één keer opnieuw opgezocht bij PDOK en de coördinaten worden bewaard; de
// rekentool hoeft het vestigingsadres dus nooit zelf te geocoderen.
export async function slaWerkgebiedOpAction(bereik: WerkgebiedBereik, invoer: unknown): Promise<WerkgebiedResultaat> {
  const { company } = await requireActiveCompany();

  if (bereik.soort === "tool") {
    const tool = await prisma.tool.findFirst({ where: { id: bereik.toolId, companyId: company.id, deletedAt: null }, select: { id: true, slug: true } });
    if (!tool) return { ok: false, error: "Deze rekentool bestaat niet meer." };
    if (bereik.overnemen) {
      await prisma.tool.update({ where: { id: tool.id }, data: { werkgebied: null as never } });
      revalidatePath("/dashboard/profiel", "layout");
      revalidatePath(`/t/${company.slug}/${tool.slug}`);
      const { parseWerkgebied } = await import("@/app/lib/werkgebied/schema");
      return { ok: true, instellingen: parseWerkgebied(company.werkgebied) };
    }
  }

  const gecontroleerd = valideerInstellingen(invoer);
  if (!gecontroleerd.ok) return gecontroleerd;
  const instellingen = gecontroleerd.waarde;

  const w = instellingen.werkgebied;
  if (w.aan && w.methode === "STRAAL" && w.start) {
    const s = w.start;
    const r = await zoekPostcodeHuisnummer(s.postcode, s.huisnummer, s.toevoeging);
    if (r.ok) {
      if (!r.waarde) return { ok: false, error: "Dit adres vind ik niet in het adressenregister. Controleer de postcode en het huisnummer." };
      w.start = { ...s, postcode: r.waarde.postcode, straat: r.waarde.straat, plaats: r.waarde.plaats, lat: r.waarde.lat, lon: r.waarde.lon };
    } else if (!(Number.isFinite(s.lat) && Number.isFinite(s.lon))) {
      return { ok: false, error: "De adressendienst is nu niet bereikbaar. Probeer het over een paar minuten opnieuw." };
    }
  }

  if (bereik.soort === "bedrijf") {
    await prisma.company.update({ where: { id: company.id }, data: { werkgebied: instellingen as never } });
  } else {
    await prisma.tool.update({ where: { id: bereik.toolId }, data: { werkgebied: instellingen as never } });
  }
  revalidatePath("/dashboard/profiel", "layout");
  revalidatePath(`/portaal/${company.slug}`);
  return { ok: true, instellingen };
}
