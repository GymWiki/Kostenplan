"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prismaBasis } from "@/app/lib/prisma";
import { getBaseUrl } from "@/app/lib/url";
import { berekenTotalen } from "@/app/lib/offerte/bereken";
import { meldHovenier } from "@/app/lib/offerte/meldingen";
import { laadPubliekeOfferte } from "@/app/lib/offerte/publiek";
import { zorgVoorGetekendePdf } from "@/app/lib/offerte/publiek-acties";
import { magNuAkkoordGeven } from "@/app/lib/offerte/status";

export type PubliekResultaat = { ok: true } | { ok: false; error: string };

async function klantIp(): Promise<string | null> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? null)?.trim().slice(0, 64) || null;
}

// Akkoord door de klant: legt naam, tijdstip, IP, user-agent, versie, gekozen optionele regels en de
// hash van de PDF van die versie vast en maakt de getekende PDF. De klant downloadt die op de
// bevestigingspagina; de hovenier vindt hem bij de lead. Er wordt geen e-mail verstuurd.
export async function geefAkkoordAction(token: string, invoer: { naam: string; vinkje: boolean; gekozen: string[]; versie: number }): Promise<PubliekResultaat> {
  const o = await laadPubliekeOfferte(token, invoer.versie);
  if (!o) return { ok: false, error: "Deze offerte bestaat niet (meer)." };
  // Server-side: verloop wordt afgeleid uit de geldig-tot-datum (Europe/Amsterdam).
  const toegestaan = magNuAkkoordGeven({ status: o.status, geldigTot: o.inhoud.geldigTot });
  if (!toegestaan.ok) {
    if (toegestaan.reden === "verlopen") return { ok: false, error: `Deze offerte is verlopen. Neem contact op met ${o.inhoud.afzender.handelsnaam}.` };
    return { ok: false, error: o.status === "GEACCEPTEERD" ? "Deze offerte is al geaccepteerd." : "Op deze offerte kun je niet meer reageren." };
  }
  if (o.nieuwer) return { ok: false, error: "Er is een nieuwere versie van deze offerte. Open de nieuwste versie om akkoord te geven." };
  const naam = invoer.naam.trim();
  if (naam.length < 2 || naam.length > 120) return { ok: false, error: "Vul je volledige naam in." };
  if (!invoer.vinkje) return { ok: false, error: "Vink aan dat je akkoord gaat met de offerte en de algemene voorwaarden." };

  const optioneel = new Set(o.inhoud.secties.flatMap((s) => s.regels).filter((r) => r.type === "optioneel").map((r) => r.id));
  const gekozen = [...new Set(invoer.gekozen)].filter((id) => optioneel.has(id));
  const totaal = berekenTotalen(o.inhoud, gekozen).totaalIncl;
  const versie = await prismaBasis.offerteVersie.findFirst({ where: { offerteId: o.id, versie: o.versie }, select: { id: true, pdfHash: true } });
  if (!versie?.pdfHash) return { ok: false, error: "Deze offerte kan nu niet worden bevestigd. Probeer het later opnieuw." };
  const h = await headers();
  const ip = await klantIp();

  // Eén akkoord per versie en alleen vanuit een openstaande status: gelijktijdige klikken geven één winnaar.
  // Was de offerte nog niet als verstuurd bevestigd (wel gedeeld), dan wordt de versie nu vergrendeld.
  try {
    await prismaBasis.$transaction(async (tx) => {
      const r = await tx.offerteV2.updateMany({ where: { id: o.id, status: { in: ["CONCEPT", "VERSTUURD", "BEKEKEN"] } }, data: { status: "GEACCEPTEERD", reactieGezien: false, verstuurdOp: new Date(), geldigTot: new Date(`${o.inhoud.geldigTot}T12:00:00Z`) } });
      if (r.count !== 1) throw new Error("al-gereageerd");
      await tx.offerteVersie.updateMany({ where: { id: versie.id, vergrendeld: false }, data: { vergrendeld: true, verstuurdOp: new Date() } });
      await tx.offerteAkkoord.create({ data: { offerteId: o.id, versieId: versie.id, naam, ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null, versieNummer: o.versie, gekozenRegelIds: gekozen, totaalInclCenten: totaal, pdfHash: versie.pdfHash! } });
      await tx.offerteGebeurtenis.create({ data: { offerteId: o.id, versieNummer: o.versie, soort: "AKKOORD", tekst: naam, ip } });
    });
  } catch {
    return { ok: false, error: "Er is al op deze offerte gereageerd." };
  }
  if (o.leadId) await prismaBasis.lead.updateMany({ where: { id: o.leadId, companyId: o.companyId }, data: { status: "GEWONNEN" } });

  // Getekende PDF meteen maken, zodat de bevestigingspagina hem kan tonen (best effort; wordt
  // anders bij de eerste download alsnog gemaakt).
  try {
    await zorgVoorGetekendePdf(o.id, await getBaseUrl());
  } catch (e) {
    console.error("[offerte] getekende PDF maken mislukt", e);
  }
  await meldHovenier({ companyId: o.companyId, leadId: o.leadId, inhoud: o.inhoud, soort: "akkoord", tekst: `Akkoord van ${naam}.` });
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function stelVraagAction(token: string, bericht: string): Promise<PubliekResultaat> {
  const o = await laadPubliekeOfferte(token);
  if (!o) return { ok: false, error: "Deze offerte bestaat niet (meer)." };
  const tekst = bericht.trim();
  if (tekst.length < 3) return { ok: false, error: "Schrijf eerst je vraag." };
  if (tekst.length > 2000) return { ok: false, error: "Je bericht is te lang (maximaal 2000 tekens)." };
  await prismaBasis.offerteGebeurtenis.create({ data: { offerteId: o.id, versieNummer: o.versie, soort: "VRAAG", tekst, ip: await klantIp() } });
  await meldHovenier({ companyId: o.companyId, leadId: o.leadId, inhoud: o.inhoud, soort: "vraag", tekst });
  revalidatePath("/dashboard/leads");
  return { ok: true };
}

export async function wijsOfferteAfAction(token: string, reden: string): Promise<PubliekResultaat> {
  const o = await laadPubliekeOfferte(token);
  if (!o) return { ok: false, error: "Deze offerte bestaat niet (meer)." };
  if (!magNuAkkoordGeven({ status: o.status, geldigTot: o.inhoud.geldigTot }).ok) return { ok: false, error: "Op deze offerte kun je niet meer reageren." };
  const r = await prismaBasis.offerteV2.updateMany({ where: { id: o.id, status: { in: ["CONCEPT", "VERSTUURD", "BEKEKEN"] } }, data: { status: "AFGEWEZEN" } });
  if (r.count !== 1) return { ok: false, error: "Er is al op deze offerte gereageerd." };
  const tekst = reden.trim().slice(0, 1000);
  await prismaBasis.offerteGebeurtenis.create({ data: { offerteId: o.id, versieNummer: o.versie, soort: "AFGEWEZEN", tekst: tekst || null, ip: await klantIp() } });
  await meldHovenier({ companyId: o.companyId, leadId: o.leadId, inhoud: o.inhoud, soort: "afgewezen", tekst: tekst ? `Reden: ${tekst}` : undefined });
  revalidatePath("/dashboard/leads");
  return { ok: true };
}
