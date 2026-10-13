"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/app/lib/dal";
import { prismaBasis } from "@/app/lib/prisma";
import { getBaseUrl } from "@/app/lib/url";
import { afzenderUit } from "@/app/lib/offerte/nieuw";
import { laadOfferteGegevens } from "@/app/lib/offerte/gegevens-server";
import { bestandsnaam } from "@/app/lib/offerte/weergave";
import { bouwFactuurBericht, type BerichtSoort } from "@/app/lib/factuur/berichten";
import { FactuurControleFout, FactuurVergrendeldFout, maakFactuurDefinitief } from "@/app/lib/factuur/opslag";
import { herberekenFactuurStatus } from "@/app/lib/factuur/beheer";
import { zorgVoorFactuurPdf } from "@/app/lib/factuur/pdf";
import type { FactuurInhoud } from "@/app/lib/factuur/model";
import { formatteerFactuurNummer } from "@/app/lib/factuur/nummer";
import { factuurTotalen } from "@/app/lib/factuur/totalen";
import type { DeelKlaarResultaat } from "@/app/lib/actions/offerte-v2";

export type DefinitiefResultaat = { ok: true; nummer: string } | { ok: false; error: string; punten?: { id: string; bericht: string; href?: string }[] };

// "Definitief maken": controleren, nummer toekennen en alles vastleggen (in één transactie), daarna de PDF vastleggen.
// De server herhaalt de controle altijd; de browser kan dit niet omzeilen.
export async function definitiefMakenAction(factuurId: string): Promise<DefinitiefResultaat> {
  const { company } = await requireActiveCompany();
  const rij = await prismaBasis.factuur.findFirst({ where: { id: factuurId, companyId: company.id }, select: { status: true, inhoud: true } });
  if (!rij) return { ok: false, error: "Factuur niet gevonden." };
  const gegevens = await laadOfferteGegevens(company);
  const inh = rij.inhoud as unknown as FactuurInhoud;
  const afzender = afzenderUit(gegevens, { kleur: inh.afzender.kleur, lettertype: inh.afzender.lettertype });
  try {
    const { nummer } = await maakFactuurDefinitief(prismaBasis, { factuurId, companyId: company.id, afzender, prefix: { factuur: gegevens.factuurPrefix, credit: gegevens.creditPrefix } });
    // Een definitieve creditnota verlaagt wat er op de oorspronkelijke factuur openstaat (of crediteert hem geheel).
    const credit = await prismaBasis.factuur.findFirst({ where: { id: factuurId, companyId: company.id }, select: { creditVoorId: true } });
    if (credit?.creditVoorId) {
      await herberekenFactuurStatus(prismaBasis, credit.creditVoorId, company.id);
      await prismaBasis.factuurGebeurtenis.create({ data: { factuurId: credit.creditVoorId, soort: "CREDITNOTA", tekst: `Creditnota ${nummer}` } });
      revalidatePath(`/dashboard/facturen/${credit.creditVoorId}`);
    }
    // De PDF mislukt zelden; lukt het nu niet, dan wordt hij bij het eerste delen of downloaden alsnog vastgelegd.
    await zorgVoorFactuurPdf(await getBaseUrl(), factuurId, company.id).catch((e) => console.error("[factuur] PDF vastleggen mislukt", e));
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/facturen");
    revalidatePath(`/dashboard/facturen/${factuurId}`);
    return { ok: true, nummer };
  } catch (e) {
    if (e instanceof FactuurControleFout) return { ok: false, error: e.message, punten: e.punten };
    if (e instanceof FactuurVergrendeldFout) return { ok: false, error: "Deze factuur is al definitief." };
    console.error("[factuur] definitief maken mislukt", e);
    return { ok: false, error: "Definitief maken is niet gelukt. Probeer het opnieuw." };
  }
}

// Klaarzetten om te delen (mail, deelmenu, WhatsApp): de PDF staat vast, het bericht is aanpasbaar.
export async function maakFactuurDeelklaarAction(factuurId: string, soort: BerichtSoort = "factuur"): Promise<DeelKlaarResultaat> {
  const { company } = await requireActiveCompany();
  const f = await prismaBasis.factuur.findFirst({ where: { id: factuurId, companyId: company.id }, select: { id: true, status: true, token: true, inhoud: true } });
  if (!f) return { ok: false, error: "Factuur niet gevonden." };
  if (f.status === "CONCEPT") return { ok: false, error: "Maak de factuur eerst definitief." };
  const basis = await getBaseUrl();
  const pdf = await zorgVoorFactuurPdf(basis, f.id, company.id).catch(() => null);
  if (!pdf) return { ok: false, error: "De PDF maken is niet gelukt. Probeer het zo opnieuw." };
  const inhoud = f.inhoud as unknown as FactuurInhoud;
  const gegevens = await laadOfferteGegevens(company);
  const link = `${basis}/f/${f.token}`;
  const bericht = bouwFactuurBericht({ inhoud, totaalInclCenten: factuurTotalen(inhoud).totaalInclCenten, link, soort: inhoud.factuur.soort === "creditnota" ? "creditnota" : soort, sjabloon: gegevens.factuurDeelTekst });
  return { ok: true, versie: 1, link, onderwerp: bericht.onderwerp, tekst: bericht.tekst, klantEmail: inhoud.klant.email, klantTelefoon: inhoud.klant.telefoon, pdfNaam: bestandsnaam(inhoud), pdfUrl: `/api/facturen/${f.id}/pdf` };
}

// Na "Ja, verstuurd": status Verstuurd met datum en een regel in de tijdlijn. Alleen de hovenier bevestigt dit.
export async function bevestigFactuurVerstuurdAction(factuurId: string, kanaal: "mail" | "delen" | "whatsapp" | "link", soort: BerichtSoort = "factuur"): Promise<{ ok: true } | { ok: false; error: string }> {
  const { company } = await requireActiveCompany();
  const f = await prismaBasis.factuur.findFirst({ where: { id: factuurId, companyId: company.id }, select: { status: true, verstuurdOp: true, inhoud: true } });
  if (!f) return { ok: false, error: "Factuur niet gevonden." };
  if (f.status === "CONCEPT") return { ok: false, error: "Maak de factuur eerst definitief." };
  const gebeurtenis = { factuur: "VERZONDEN", creditnota: "VERZONDEN", herinnering: "HERINNERING", aanmaning: "AANMANING", "laatste-herinnering": "LAATSTE_HERINNERING" }[soort] as "VERZONDEN" | "HERINNERING" | "AANMANING" | "LAATSTE_HERINNERING";
  await prismaBasis.factuur.update({
    where: { id: factuurId },
    data: {
      ...(f.status === "DEFINITIEF" && (soort === "factuur" || soort === "creditnota") ? { status: "VERSTUURD" as const } : {}),
      ...(f.verstuurdOp ? {} : { verstuurdOp: new Date() }),
      gebeurtenissen: { create: { soort: gebeurtenis, tekst: `via ${kanaal}` } },
    },
  });
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/facturen");
  revalidatePath(`/dashboard/facturen/${factuurId}`);
  return { ok: true };
}

// Het nummer dat de factuur naar verwachting krijgt (alleen voor de bevestiging; het echte nummer wordt pas bij
// "Definitief maken" in een transactie toegekend).
export async function volgendFactuurnummerAction(factuurId: string): Promise<string | null> {
  const { company } = await requireActiveCompany();
  const f = await prismaBasis.factuur.findFirst({ where: { id: factuurId, companyId: company.id }, select: { type: true, inhoud: true } });
  if (!f) return null;
  const gegevens = await laadOfferteGegevens(company);
  const inh = f.inhoud as unknown as FactuurInhoud;
  const jaar = Number(inh.factuur.factuurdatum.slice(0, 4)) || new Date().getFullYear();
  const reeks = f.type === "CREDITNOTA" ? "C" : "F";
  const teller = await prismaBasis.factuurNummerTeller.findUnique({ where: { companyId_reeks_jaar: { companyId: company.id, reeks, jaar } }, select: { laatste: true } });
  return formatteerFactuurNummer(reeks === "C" ? gegevens.creditPrefix : gegevens.factuurPrefix, jaar, (teller?.laatste ?? 0) + 1);
}
