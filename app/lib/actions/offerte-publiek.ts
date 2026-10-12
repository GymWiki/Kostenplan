"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prismaBasis } from "@/app/lib/prisma";
import { getBaseUrl } from "@/app/lib/url";
import { berekenTotalen } from "@/app/lib/offerte/bereken";
import { bestandsnaam } from "@/app/lib/offerte/weergave";
import { meldHovenier } from "@/app/lib/offerte/meldingen";
import { laadPubliekeOfferte } from "@/app/lib/offerte/publiek";
import { markeerVerlopen, zorgVoorGetekendePdf } from "@/app/lib/offerte/publiek-acties";
import { verstuurBrevoMail } from "@/app/lib/mail/brevo";
import { magAkkoordGeven } from "@/app/lib/offerte/status";
import { isGeldigEmail } from "@/app/lib/offerte/validatie";

export type PubliekResultaat = { ok: true } | { ok: false; error: string };

async function klantIp(): Promise<string | null> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? null)?.trim().slice(0, 64) || null;
}

// Akkoord door de klant: legt naam, tijdstip, IP, user-agent, versie, gekozen
// optionele regels en de hash van de PDF van die versie vast, maakt de getekende
// PDF en stuurt die naar klant en hovenier.
export async function geefAkkoordAction(token: string, invoer: { naam: string; vinkje: boolean; gekozen: string[]; versie: number }): Promise<PubliekResultaat> {
  const o = await laadPubliekeOfferte(token, invoer.versie);
  if (!o) return { ok: false, error: "Deze offerte bestaat niet (meer)." };
  if (o.weergaveStatus === "VERLOPEN") {
    await markeerVerlopen(o.id);
    return { ok: false, error: `Deze offerte is verlopen. Neem contact op met ${o.inhoud.afzender.handelsnaam}.` };
  }
  if (!magAkkoordGeven(o.status)) return { ok: false, error: o.status === "GEACCEPTEERD" ? "Deze offerte is al geaccepteerd." : "Op deze offerte kun je niet meer reageren." };
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

  // Eén akkoord per versie en alleen vanuit een openstaande status: gelijktijdige klikken geven één winnaar.
  try {
    await prismaBasis.$transaction(async (tx) => {
      const r = await tx.offerteV2.updateMany({ where: { id: o.id, status: { in: ["VERSTUURD", "BEKEKEN"] } }, data: { status: "GEACCEPTEERD" } });
      if (r.count !== 1) throw new Error("al-gereageerd");
      await tx.offerteAkkoord.create({
        data: { offerteId: o.id, versieId: versie.id, naam, ip: await klantIp(), userAgent: h.get("user-agent")?.slice(0, 300) ?? null, versieNummer: o.versie, gekozenRegelIds: gekozen, totaalInclCenten: totaal, pdfHash: versie.pdfHash! },
      });
      await tx.offerteGebeurtenis.create({ data: { offerteId: o.id, versieNummer: o.versie, soort: "AKKOORD", tekst: naam, ip: await klantIp() } });
    });
  } catch {
    return { ok: false, error: "Er is al op deze offerte gereageerd." };
  }
  if (o.leadId) await prismaBasis.lead.updateMany({ where: { id: o.leadId }, data: { status: "GEWONNEN" } });

  // Getekende PDF + e-mails (best effort; het akkoord zelf staat al vast).
  const basis = await getBaseUrl();
  let pdf: Buffer | null = null;
  try {
    pdf = await zorgVoorGetekendePdf(o.id, basis);
  } catch (e) {
    console.error("[offerte] getekende PDF maken mislukt", e);
  }
  const a = o.inhoud.afzender;
  const bijlagen = [...(pdf ? [{ naam: bestandsnaam(o.inhoud).replace(/\.pdf$/, " – getekend.pdf"), content: pdf }] : []), ...(o.inhoud.bijlagen[0] ? [{ naam: o.inhoud.bijlagen[0].naam, url: o.inhoud.bijlagen[0].url }] : [])];
  if (isGeldigEmail(o.inhoud.klant.email)) {
    await verstuurBrevoMail({
      afzenderNaam: a.handelsnaam,
      naar: { email: o.inhoud.klant.email, naam: o.inhoud.klant.naam },
      replyTo: a.email ? { email: a.email, naam: a.contactNaam || a.handelsnaam } : undefined,
      onderwerp: `Bevestiging: uw akkoord op offerte ${o.nummer} van ${a.handelsnaam}`,
      tekst: `Geachte ${o.inhoud.klant.naam},\n\nHartelijk dank. Uw akkoord op offerte ${o.nummer} is vastgelegd. In de bijlage vindt u de getekende offerte.\n\nMet vriendelijke groet,\n${a.contactNaam}\n${a.handelsnaam}`,
      html: `<p>Geachte ${o.inhoud.klant.naam.replace(/</g, "&lt;")},</p><p>Hartelijk dank. Uw akkoord op offerte ${o.nummer} is vastgelegd. In de bijlage vindt u de getekende offerte.</p><p>Met vriendelijke groet,<br>${a.contactNaam.replace(/</g, "&lt;")}<br>${a.handelsnaam.replace(/</g, "&lt;")}</p>`,
      bijlagen,
    }).catch(() => undefined);
  }
  await meldHovenier({ companyId: o.companyId, leadId: o.leadId, inhoud: o.inhoud, soort: "akkoord", tekst: `Akkoord van ${naam}.`, klantEmail: o.inhoud.klant.email, bijlage: pdf ? { naam: bestandsnaam(o.inhoud).replace(/\.pdf$/, " – getekend.pdf"), content: pdf } : undefined });
  revalidatePath("/dashboard/leads");
  return { ok: true };
}

export async function stelVraagAction(token: string, bericht: string): Promise<PubliekResultaat> {
  const o = await laadPubliekeOfferte(token);
  if (!o) return { ok: false, error: "Deze offerte bestaat niet (meer)." };
  const tekst = bericht.trim();
  if (tekst.length < 3) return { ok: false, error: "Schrijf eerst je vraag." };
  if (tekst.length > 2000) return { ok: false, error: "Je bericht is te lang (maximaal 2000 tekens)." };
  await prismaBasis.offerteGebeurtenis.create({ data: { offerteId: o.id, versieNummer: o.versie, soort: "VRAAG", tekst, ip: await klantIp() } });
  await meldHovenier({ companyId: o.companyId, leadId: o.leadId, inhoud: o.inhoud, soort: "vraag", tekst, klantEmail: o.inhoud.klant.email });
  revalidatePath("/dashboard/leads");
  return { ok: true };
}

export async function wijsOfferteAfAction(token: string, reden: string): Promise<PubliekResultaat> {
  const o = await laadPubliekeOfferte(token);
  if (!o) return { ok: false, error: "Deze offerte bestaat niet (meer)." };
  if (!magAkkoordGeven(o.status)) return { ok: false, error: "Op deze offerte kun je niet meer reageren." };
  const r = await prismaBasis.offerteV2.updateMany({ where: { id: o.id, status: { in: ["VERSTUURD", "BEKEKEN"] } }, data: { status: "AFGEWEZEN" } });
  if (r.count !== 1) return { ok: false, error: "Er is al op deze offerte gereageerd." };
  const tekst = reden.trim().slice(0, 1000);
  await prismaBasis.offerteGebeurtenis.create({ data: { offerteId: o.id, versieNummer: o.versie, soort: "AFGEWEZEN", tekst: tekst || null, ip: await klantIp() } });
  await meldHovenier({ companyId: o.companyId, leadId: o.leadId, inhoud: o.inhoud, soort: "afgewezen", tekst: tekst ? `Reden: ${tekst}` : undefined, klantEmail: o.inhoud.klant.email });
  revalidatePath("/dashboard/leads");
  return { ok: true };
}
