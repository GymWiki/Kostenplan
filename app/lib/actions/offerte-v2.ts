"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma, prismaBasis } from "@/app/lib/prisma";
import { effectiveTier } from "@/app/lib/subscription";
import { laadOfferteGegevens } from "@/app/lib/offerte/gegevens-server";
import { ontbrekendeVerplichteGegevens } from "@/app/lib/offerte/gegevens";
import { bouwInhoudUitLead } from "@/app/lib/offerte/nieuw";
import { bewaarConcept, maakNieuweVersie, maakOfferte, OfferteVergrendeldFout } from "@/app/lib/offerte/opslag";
import { parseOfferteInhoud } from "@/app/lib/offerte/schema";
import { getBaseUrl } from "@/app/lib/url";
import { controleerOfferte } from "@/app/lib/offerte/controle";
import { bouwOfferteMail, whatsappDeelLink } from "@/app/lib/offerte/mail";
import { maakOffertePdf, sha256 } from "@/app/lib/offerte/pdf";
import { maakPrintToken } from "@/app/lib/offerte/pdf-token";
import { bestandsnaam } from "@/app/lib/offerte/weergave";
import { afzenderUit } from "@/app/lib/offerte/nieuw";
import { publiekeOfferteLink } from "@/app/lib/offerte/links";
import { verstuurBrevoMail, type MailBijlage } from "@/app/lib/mail/brevo";
import { vergrendelVersie } from "@/app/lib/offerte/opslag";
import type { OfferteInhoud } from "@/app/lib/offerte/model";


export type MaakOfferteResultaat = { ok: true; offerteId: string } | { ok: false; reden: "ontbreekt" | "niet-gevonden"; error: string };

// "Offerte maken" vanuit een lead: één nieuwe offerte (versie 1) met secties en
// losse regels uit de berekening. Idempotent: bestaat er al een offerte voor
// deze lead, dan wordt die geopend.
export async function maakOfferteV2Action(leadId: string): Promise<MaakOfferteResultaat> {
  const { company } = await requireActiveCompany();
  const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId: company.id }, include: { offertesV2: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!lead) return { ok: false, reden: "niet-gevonden", error: "Deze lead bestaat niet meer." };
  if (lead.offertesV2[0]) return { ok: true, offerteId: lead.offertesV2[0].id };

  const gegevens = await laadOfferteGegevens(company);
  if (ontbrekendeVerplichteGegevens(gegevens).length > 0) return { ok: false, reden: "ontbreekt", error: "Er ontbreken nog gegevens voor op de offerte." };

  const branding = await prisma.branding.findUnique({ where: { toolId: lead.toolId }, select: { primaireKleur: true, lettertype: true } });
  const mogenHuisstijl = effectiveTier(company) !== "GRATIS";
  const huisstijl = { kleur: mogenHuisstijl ? (branding?.primaireKleur ?? "#15803d") : "#15803d", lettertype: mogenHuisstijl ? (branding?.lettertype ?? "MODERN") : "MODERN" };

  if (lead.status === "EXTERN_AFGEHANDELD") await prisma.lead.update({ where: { id: lead.id }, data: { status: "IN_BEHANDELING" } });

  const { id } = await maakOfferte(prismaBasis, {
    companyId: company.id,
    leadId: lead.id,
    prefix: gegevens.nummerPrefix,
    bouw: (nummer) => bouwInhoudUitLead({ nummer, lead, gegevens, huisstijl }).inhoud,
  });
  revalidatePath("/dashboard/leads");
  return { ok: true, offerteId: id };
}

// ── Bewerken ─────────────────────────────────────────────────────────────

export type BewaarResultaat = { ok: true } | { ok: false; vergrendeld?: boolean; error: string };

// Autosave van het concept. Een verstuurde versie wordt nooit overschreven.
export async function bewaarOfferteAction(offerteId: string, inhoud: unknown): Promise<BewaarResultaat> {
  const { company } = await requireActiveCompany();
  const p = parseOfferteInhoud(inhoud);
  if (!p.ok) return { ok: false, error: p.error };
  try {
    await bewaarConcept(prismaBasis, { offerteId, companyId: company.id, inhoud: p.inhoud });
    return { ok: true };
  } catch (e) {
    if (e instanceof OfferteVergrendeldFout) return { ok: false, vergrendeld: true, error: e.message };
    console.error("[offerte] bewaren mislukt", e);
    return { ok: false, error: "Opslaan is niet gelukt." };
  }
}

// Wijzigen na versturen: een nieuwe versie (concept) naast de verstuurde.
export async function nieuweVersieAction(offerteId: string): Promise<{ ok: true; versie: number } | { ok: false; error: string }> {
  const { company } = await requireActiveCompany();
  try {
    const versie = await maakNieuweVersie(prismaBasis, { offerteId, companyId: company.id });
    revalidatePath("/dashboard/leads");
    return { ok: true, versie };
  } catch (e) {
    return { ok: false, error: e instanceof OfferteVergrendeldFout ? "Een geaccepteerde offerte kan niet meer worden gewijzigd." : "Nieuwe versie maken is niet gelukt." };
  }
}

// ── Standaardregels ───────────────────────────────────────────────────────

export type StandaardRegelDto = { id: string; omschrijving: string; eenheid: string; prijsCenten: number; btw: number; soort: string };

export async function slaStandaardRegelOpAction(r: { omschrijving: string; eenheid: string; prijsCenten: number; btw: number; soort: string }): Promise<{ ok: true; regel: StandaardRegelDto } | { ok: false; error: string }> {
  const { company } = await requireActiveCompany();
  const omschrijving = r.omschrijving.trim().slice(0, 300);
  if (!omschrijving) return { ok: false, error: "Geef de regel eerst een omschrijving." };
  if (!Number.isInteger(r.prijsCenten) || Math.abs(r.prijsCenten) > 1_000_000_000) return { ok: false, error: "Ongeldig bedrag." };
  const regel = await prisma.offerteStandaardRegel.create({
    data: { companyId: company.id, omschrijving, eenheid: r.eenheid.slice(0, 20), prijsCenten: r.prijsCenten, btw: [21, 9, 0].includes(r.btw) ? r.btw : 21, soort: ["arbeid", "materiaal", "planten", "transport", "overig"].includes(r.soort) ? r.soort : "overig" },
  });
  return { ok: true, regel };
}

export async function verwijderStandaardRegelAction(id: string): Promise<{ ok: true }> {
  const { company } = await requireActiveCompany();
  await prisma.offerteStandaardRegel.deleteMany({ where: { id, companyId: company.id } });
  return { ok: true };
}

// ── Controleren en versturen ──────────────────────────────────────────────


export type VerstuurResultaat =
  | { ok: true; link: string; whatsapp: string; mail: "verzonden" | "mislukt" | "niet-gevraagd"; mailFout?: string }
  | { ok: false; error: string };

async function haalBijlage(url: string, naam: string): Promise<MailBijlage[]> {
  // De algemene voorwaarden staan publiek in opslag; Brevo haalt ze zelf op via de URL.
  return [{ naam, url }];
}


// Verstuurt de huidige versie: controle (server-side), PDF maken, versie vergrendelen, en
// e-mailen (kanaal "email") of alleen de link vrijgeven (kanaal "link": de hovenier deelt zelf).
export async function verstuurOfferteAction(offerteId: string, kanaal: "email" | "link"): Promise<VerstuurResultaat> {
  const { company } = await requireActiveCompany();
  const o = await prismaBasis.offerteV2.findFirst({ where: { id: offerteId, companyId: company.id }, include: { versies: { orderBy: { versie: "desc" }, take: 1, omit: { pdfData: true } } } });
  if (!o) return { ok: false, error: "Offerte niet gevonden." };
  if (o.status === "GEACCEPTEERD") return { ok: false, error: "Deze offerte is al geaccepteerd." };
  const versie = o.versies[0];
  if (versie.vergrendeld) return { ok: false, error: "Deze versie is al verstuurd. Maak een nieuwe versie om opnieuw te versturen." };

  // 1. Actuele bedrijfsgegevens uit Profiel overnemen (en de algemene voorwaarden), dan controleren.
  const gegevens = await laadOfferteGegevens(company);
  let inhoud = versie.inhoud as unknown as OfferteInhoud;
  inhoud = {
    ...inhoud,
    afzender: afzenderUit(gegevens, { kleur: inhoud.afzender.kleur, lettertype: inhoud.afzender.lettertype }),
    bijlagen: gegevens.voorwaardenPdfUrl ? [{ naam: gegevens.voorwaardenPdfNaam || "Algemene voorwaarden.pdf", url: gegevens.voorwaardenPdfUrl }] : [],
  };
  const controle = controleerOfferte(inhoud);
  if (controle.blokkerend.length > 0) return { ok: false, error: controle.blokkerend[0].bericht };
  await bewaarConcept(prismaBasis, { offerteId, companyId: company.id, inhoud });

  // 2. PDF van precies deze inhoud.
  const basis = await getBaseUrl();
  let pdf: Buffer;
  try {
    pdf = await maakOffertePdf(`${basis}/offerte-print/${maakPrintToken({ k: "versie", o: offerteId, v: versie.versie })}`, inhoud);
  } catch (e) {
    console.error("[offerte] PDF maken mislukt", e);
    return { ok: false, error: "De PDF maken is niet gelukt. Er is niets verstuurd; probeer het zo opnieuw." };
  }

  // 3. Vergrendelen en status bijwerken (vanaf nu onveranderlijk).
  try {
    await vergrendelVersie(prismaBasis, { offerteId, versie: versie.versie, pdf, pdfHash: sha256(pdf) });
  } catch {
    return { ok: false, error: "Deze versie is al verstuurd." };
  }
  await prismaBasis.offerteV2.update({ where: { id: offerteId }, data: { status: "VERSTUURD", verstuurdOp: new Date() } });
  await prismaBasis.offerteGebeurtenis.create({ data: { offerteId, versieNummer: versie.versie, soort: "VERZONDEN", tekst: kanaal === "email" ? `per e-mail naar ${inhoud.klant.email}` : "link gedeeld door de hovenier" } });
  if (o.leadId) await prismaBasis.lead.updateMany({ where: { id: o.leadId, companyId: company.id }, data: { status: "OFFERTE_VERSTUURD" } });

  const link = publiekeOfferteLink(basis, o.token);
  const whatsapp = whatsappDeelLink(inhoud, link, inhoud.klant.telefoon);
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${o.leadId}/offerte`);
  if (kanaal === "link") return { ok: true, link, whatsapp, mail: "niet-gevraagd" };

  // 4. E-mail met link, PDF en algemene voorwaarden.
  const mail = bouwOfferteMail({ inhoud, link });
  const bijlagen: MailBijlage[] = [{ naam: bestandsnaam(inhoud), content: pdf }, ...(inhoud.bijlagen[0] ? await haalBijlage(inhoud.bijlagen[0].url, inhoud.bijlagen[0].naam) : [])];
  const r = await verstuurBrevoMail({
    afzenderNaam: inhoud.afzender.handelsnaam,
    naar: { email: inhoud.klant.email, naam: inhoud.klant.naam },
    replyTo: inhoud.afzender.email ? { email: inhoud.afzender.email, naam: inhoud.afzender.contactNaam || inhoud.afzender.handelsnaam } : undefined,
    onderwerp: mail.onderwerp,
    tekst: mail.tekst,
    html: mail.html,
    bijlagen,
  });
  if (!r.ok) {
    await prismaBasis.offerteGebeurtenis.create({ data: { offerteId, versieNummer: versie.versie, soort: "VERZONDEN", tekst: `e-mail mislukt: ${r.fout}` } });
    return { ok: true, link, whatsapp, mail: "mislukt", mailFout: r.fout };
  }
  return { ok: true, link, whatsapp, mail: "verzonden" };
}

// Voorbeeld van de e-mail voor de bevestiging in de pagina (geen verzending).
export async function offerteMailVoorbeeldAction(offerteId: string, inhoud: unknown): Promise<{ ok: true; onderwerp: string; tekst: string; html: string; naar: string } | { ok: false; error: string }> {
  const { company } = await requireActiveCompany();
  const p = parseOfferteInhoud(inhoud);
  if (!p.ok) return { ok: false, error: p.error };
  const o = await prismaBasis.offerteV2.findFirst({ where: { id: offerteId, companyId: company.id }, select: { token: true } });
  if (!o) return { ok: false, error: "Offerte niet gevonden." };
  const m = bouwOfferteMail({ inhoud: p.inhoud, link: publiekeOfferteLink(await getBaseUrl(), o.token) });
  return { ok: true, ...m, naar: p.inhoud.klant.email };
}

// Opnieuw versturen van de mail van een al verstuurde versie (bijv. na een mislukte poging).
export async function herzendOfferteMailAction(offerteId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { company } = await requireActiveCompany();
  const o = await prismaBasis.offerteV2.findFirst({ where: { id: offerteId, companyId: company.id }, include: { versies: { where: { vergrendeld: true }, orderBy: { versie: "desc" }, take: 1 } } });
  const v = o?.versies[0];
  if (!o || !v) return { ok: false, error: "Er is nog geen verstuurde versie." };
  const inhoud = v.inhoud as unknown as OfferteInhoud;
  const mail = bouwOfferteMail({ inhoud, link: publiekeOfferteLink(await getBaseUrl(), o.token) });
  const r = await verstuurBrevoMail({
    afzenderNaam: inhoud.afzender.handelsnaam,
    naar: { email: inhoud.klant.email, naam: inhoud.klant.naam },
    replyTo: inhoud.afzender.email ? { email: inhoud.afzender.email, naam: inhoud.afzender.contactNaam || inhoud.afzender.handelsnaam } : undefined,
    onderwerp: mail.onderwerp,
    tekst: mail.tekst,
    html: mail.html,
    bijlagen: [...(v.pdfData ? [{ naam: bestandsnaam(inhoud), content: Buffer.from(v.pdfData) }] : []), ...(inhoud.bijlagen[0] ? [{ naam: inhoud.bijlagen[0].naam, url: inhoud.bijlagen[0].url }] : [])],
  });
  if (!r.ok) return { ok: false, error: r.fout };
  await prismaBasis.offerteGebeurtenis.create({ data: { offerteId, versieNummer: v.versie, soort: "VERZONDEN", tekst: `opnieuw per e-mail naar ${inhoud.klant.email}` } });
  return { ok: true };
}
