import "server-only";
import { prismaBasis } from "@/app/lib/prisma";
import { stuurPush } from "@/app/lib/push/versturen";
import { verstuurBrevoMail } from "@/app/lib/mail/brevo";
import type { OfferteInhoud } from "./model";

export type MeldingSoort = "bekeken" | "akkoord" | "vraag" | "afgewezen";

const TITEL: Record<MeldingSoort, (nr: string, naam: string) => string> = {
  bekeken: (nr, naam) => `${naam} heeft offerte ${nr} bekeken`,
  akkoord: (nr, naam) => `${naam} is akkoord met offerte ${nr}`,
  vraag: (nr, naam) => `${naam} heeft een vraag over offerte ${nr}`,
  afgewezen: (nr, naam) => `${naam} heeft offerte ${nr} afgewezen`,
};

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Meldt de hovenier (e-mail en, als die bestaat, push) dat de klant iets met de offerte deed. Faalt nooit.
export async function meldHovenier({
  companyId,
  leadId,
  inhoud,
  soort,
  tekst,
  klantEmail,
  bijlage,
}: {
  companyId: string;
  leadId: string | null;
  inhoud: OfferteInhoud;
  soort: MeldingSoort;
  tekst?: string;
  klantEmail?: string;
  bijlage?: { naam: string; content: Buffer };
}): Promise<void> {
  const onderwerp = TITEL[soort](inhoud.nummer, inhoud.klant.naam || "De klant");
  const url = leadId ? `/dashboard/leads/${leadId}/offerte` : "/dashboard/leads";
  try {
    await stuurPush(companyId, { titel: onderwerp, tekst: tekst ? tekst.slice(0, 120) : inhoud.onderwerp, url });
  } catch {
    // push is een bijzaak
  }
  const bedrijf = await prismaBasis.company.findUnique({ where: { id: companyId }, select: { creator: { select: { email: true } } } }).catch(() => null);
  const naar = inhoud.afzender.email || bedrijf?.creator.email;
  if (!naar) return;
  const regels = [`Offerte ${inhoud.nummer} – ${inhoud.onderwerp}`, `Klant: ${inhoud.klant.naam}${inhoud.klant.bedrijfsnaam ? ` (${inhoud.klant.bedrijfsnaam})` : ""}`, tekst ? `\n${tekst}` : ""].filter(Boolean);
  await verstuurBrevoMail({
    afzenderNaam: "Kostenplan",
    naar: { email: naar },
    replyTo: klantEmail ? { email: klantEmail, naam: inhoud.klant.naam } : undefined,
    onderwerp,
    tekst: `${regels.join("\n")}\n\nJe ziet dit ook bij Leads in je dashboard.`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5"><h2 style="margin:0 0 12px">${esc(onderwerp)}</h2><p>${regels.map(esc).join("<br>").replace(/\n/g, "<br>")}</p><p style="color:#6b7280">Je ziet dit ook bij Leads in je dashboard.</p></div>`,
    bijlagen: bijlage ? [{ naam: bijlage.naam, content: bijlage.content }] : undefined,
  }).catch(() => undefined);
}
