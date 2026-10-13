import "server-only";
import { prismaBasis } from "@/app/lib/prisma";
import type { LeadSnapshot } from "@/app/lib/leads";
import { resolveWerkgebied } from "@/app/lib/werkgebied/schema";
import { bouwAfwijzing } from "@/app/lib/werkgebied/afwijzingsmail";
import { mailGeconfigureerd } from "./lead-mail";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Optioneel (standaard uit): een vriendelijke afwijzing aan de klant bij een aanvraag buiten het werkgebied.
// Eén poging per lead; een mislukte mail kost nooit een lead en wordt niet opnieuw geprobeerd.
export async function verstuurAfwijzingsMail(leadId: string): Promise<"verzonden" | "overgeslagen" | "mislukt"> {
  if (!mailGeconfigureerd()) return "overgeslagen";
  try {
    const lead = await prismaBasis.lead.findUnique({
      where: { id: leadId },
      select: {
        naam: true,
        email: true,
        snapshot: true,
        afwijzingVerzondOp: true,
        company: { select: { naam: true, werkgebied: true, creator: { select: { email: true } } } },
        tool: { select: { werkgebied: true } },
      },
    });
    if (!lead || lead.afwijzingVerzondOp) return "overgeslagen";
    const snap = lead.snapshot as unknown as LeadSnapshot;
    const buiten = (snap.locatie?.markeringen ?? snap.markeringen ?? []).includes("BUITEN_WERKGEBIED");
    const w = resolveWerkgebied(lead.company.werkgebied, lead.tool.werkgebied).werkgebied;
    if (!buiten || !w.aan || !w.afwijzingsmail.aan) return "overgeslagen";

    const mail = bouwAfwijzing(w.afwijzingsmail, lead.naam, lead.company.naam);
    // Eerst vastleggen, dan versturen: bij een haperende tweede poging gaat er nooit twee keer dezelfde mail uit.
    const geclaimd = await prismaBasis.lead.updateMany({ where: { id: leadId, afwijzingVerzondOp: null }, data: { afwijzingVerzondOp: new Date() } });
    if (geclaimd.count === 0) return "overgeslagen";
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: lead.company.naam, email: process.env.MAIL_AFZENDER_EMAIL || "aanvragen@kostenplan.nl" },
        to: [{ email: lead.email, name: lead.naam }],
        replyTo: { email: lead.company.creator.email, name: lead.company.naam },
        subject: mail.onderwerp,
        textContent: mail.tekst,
        htmlContent: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">${esc(mail.tekst).replace(/\n/g, "<br>")}</div>`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Brevo gaf ${res.status}`);
    return "verzonden";
  } catch (e) {
    console.error("[afwijzing-mail] versturen mislukt", { leadId, fout: e instanceof Error ? e.message : String(e) });
    return "mislukt";
  }
}
