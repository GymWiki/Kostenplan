import "server-only";
import { prismaBasis } from "@/app/lib/prisma";
import { formatCurrency } from "@/app/lib/format";
import type { LeadSnapshot } from "@/app/lib/leads";

// Uitgaande e-mail over nieuwe leads. De lead staat dan al in de database; de
// mail is een bijzaak die opnieuw geprobeerd wordt tot hij lukt, zodat een
// storing bij de maildienst (Brevo) nooit een lead kost.
const MAX_POGINGEN = 12;

export function mailGeconfigureerd(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

// Wachttijd na poging n (1-gebaseerd): 2, 4, 8 ... minuten, maximaal 6 uur.
export function volgendePogingNa(poging: number, nu: Date): Date {
  const minuten = Math.min(2 ** poging, 360);
  return new Date(nu.getTime() + minuten * 60_000);
}

function esc(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function bouwLeadMail(lead: {
  naam: string;
  email: string;
  telefoonnummer: string | null;
  toolNaamSnapshot: string;
  snapshot: unknown;
  totaalIndicatie: number;
}) {
  const snap = lead.snapshot as LeadSnapshot;
  const regels = (snap.regels ?? []).map((r) => {
    const aantal = r.aantal != null ? ` – ${r.aantal}${r.eenheid ? ` ${r.eenheid}` : ""}` : "";
    const materiaal = r.materiaal ? ` (${r.materiaal})` : "";
    return `${r.naam}${aantal}${materiaal}`;
  });
  const tekst = [
    `Nieuwe aanvraag via ${lead.toolNaamSnapshot}`,
    "",
    `Naam: ${lead.naam}`,
    `E-mail: ${lead.email}`,
    lead.telefoonnummer ? `Telefoon: ${lead.telefoonnummer}` : null,
    "",
    ...regels,
    "",
    `Indicatie totaal (incl. btw): ${formatCurrency(lead.totaalIndicatie)}`,
  ]
    .filter((x) => x !== null)
    .join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5"><h2 style="margin:0 0 12px">Nieuwe aanvraag via ${esc(lead.toolNaamSnapshot)}</h2><p><strong>${esc(lead.naam)}</strong><br>${esc(lead.email)}${lead.telefoonnummer ? `<br>${esc(lead.telefoonnummer)}` : ""}</p><ul>${regels.map((r) => `<li>${esc(r)}</li>`).join("")}</ul><p><strong>Indicatie totaal (incl. btw): ${esc(formatCurrency(lead.totaalIndicatie))}</strong></p><p style="color:#6b7280">Je ziet deze aanvraag ook bij Leads in je dashboard.</p></div>`;
  return { onderwerp: `Nieuwe aanvraag: ${lead.naam}`, tekst, html };
}

// Verstuurt de mail van één lead. Gooit nooit; legt de uitkomst vast.
export async function verstuurLeadMail(leadId: string): Promise<"verzonden" | "later" | "overgeslagen"> {
  if (!mailGeconfigureerd()) return "overgeslagen";
  try {
    const lead = await prismaBasis.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        naam: true,
        email: true,
        telefoonnummer: true,
        toolNaamSnapshot: true,
        snapshot: true,
        totaalIndicatie: true,
        mailVerzondOp: true,
        mailPogingen: true,
        company: { select: { naam: true, creator: { select: { email: true } } } },
      },
    });
    if (!lead || lead.mailVerzondOp) return "overgeslagen";

    const mail = bouwLeadMail(lead);
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: {
            name: process.env.MAIL_AFZENDER_NAAM || "Kostenplan",
            email: process.env.MAIL_AFZENDER_EMAIL || "aanvragen@kostenplan.nl",
          },
          to: [{ email: lead.company.creator.email, name: lead.company.naam }],
          replyTo: { email: lead.email, name: lead.naam },
          subject: mail.onderwerp,
          textContent: mail.tekst,
          htmlContent: mail.html,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Brevo gaf ${res.status}`);
      await prismaBasis.lead.update({
        where: { id: leadId },
        data: { mailVerzondOp: new Date(), mailFout: null, mailVolgendePoging: null },
      });
      return "verzonden";
    } catch (e) {
      const poging = lead.mailPogingen + 1;
      const fout = (e instanceof Error ? e.message : String(e)).slice(0, 300);
      console.error("[lead-mail] versturen mislukt, later opnieuw", { leadId, poging, fout });
      await prismaBasis.lead.update({
        where: { id: leadId },
        data: {
          mailPogingen: poging,
          mailFout: fout,
          mailVolgendePoging: poging >= MAX_POGINGEN ? null : volgendePogingNa(poging, new Date()),
        },
      });
      return "later";
    }
  } catch (e) {
    console.error("[lead-mail] onverwachte fout", { leadId, fout: e instanceof Error ? e.message : String(e) });
    return "later";
  }
}

// Haalt mails in die nog niet verstuurd zijn en aan de beurt zijn.
export async function verwerkMailWachtrij(max = 10): Promise<{ verzonden: number; later: number }> {
  if (!mailGeconfigureerd()) return { verzonden: 0, later: 0 };
  let verzonden = 0;
  let later = 0;
  try {
    const nu = new Date();
    const open = await prismaBasis.lead.findMany({
      where: {
        mailVerzondOp: null,
        mailPogingen: { lt: MAX_POGINGEN },
        OR: [{ mailVolgendePoging: null }, { mailVolgendePoging: { lte: nu } }],
      },
      orderBy: { createdAt: "asc" },
      take: max,
      select: { id: true },
    });
    for (const { id } of open) {
      const uitslag = await verstuurLeadMail(id);
      if (uitslag === "verzonden") verzonden += 1;
      else if (uitslag === "later") later += 1;
    }
  } catch (e) {
    console.error("[lead-mail] wachtrij lezen mislukt", e instanceof Error ? e.message : e);
  }
  return { verzonden, later };
}
