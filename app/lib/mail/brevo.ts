import "server-only";

// Eén plek voor uitgaande e-mail via Brevo (offertes, meldingen, herinneringen).
export const brevoGeconfigureerd = () => Boolean(process.env.BREVO_API_KEY);

export type MailBijlage = { naam: string; content?: Buffer; url?: string };

export async function verstuurBrevoMail(m: {
  afzenderNaam: string;
  naar: { email: string; naam?: string };
  replyTo?: { email: string; naam?: string };
  onderwerp: string;
  tekst: string;
  html: string;
  bijlagen?: MailBijlage[];
}): Promise<{ ok: true } | { ok: false; fout: string }> {
  if (!brevoGeconfigureerd()) return { ok: false, fout: "E-mail is niet geconfigureerd (BREVO_API_KEY ontbreekt)." };
  try {
    const res = await fetch(process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: m.afzenderNaam, email: process.env.MAIL_AFZENDER_EMAIL || "aanvragen@kostenplan.nl" },
        to: [{ email: m.naar.email, name: m.naar.naam }],
        replyTo: m.replyTo ? { email: m.replyTo.email, name: m.replyTo.naam } : undefined,
        subject: m.onderwerp,
        textContent: m.tekst,
        htmlContent: m.html,
        attachment: m.bijlagen?.map((b) => (b.content ? { name: b.naam, content: b.content.toString("base64") } : { name: b.naam, url: b.url })),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { ok: false, fout: `Brevo gaf ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, fout: e instanceof Error ? e.message.slice(0, 200) : "Onbekende fout" };
  }
}
