import "server-only";
import { after } from "next/server";
import webpush from "web-push";
import { prismaBasis } from "@/app/lib/prisma";

// Meldingen zijn alleen actief als beide VAPID-sleutels zijn ingesteld.
export function pushBeschikbaar(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function config() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:info@kostenplan.nl",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export type PushBericht = { titel: string; tekst: string; url: string };

// Stuurt een melding naar alle toestemmende toestellen van een bedrijf.
// Faalt nooit; ongeldige abonnementen (410/404) worden opgeruimd.
export async function stuurPush(companyId: string, bericht: PushBericht): Promise<{ verstuurd: number }> {
  if (!pushBeschikbaar()) return { verstuurd: 0 };
  let verstuurd = 0;
  try {
    config();
    const abonnementen = await prismaBasis.pushAbonnement.findMany({ where: { companyId } });
    await Promise.all(
      abonnementen.map(async (a) => {
        try {
          await webpush.sendNotification(
            { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
            JSON.stringify(bericht),
            { TTL: 3600, urgency: "high" }
          );
          verstuurd += 1;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await prismaBasis.pushAbonnement.delete({ where: { id: a.id } }).catch(() => {});
          } else {
            console.error("[push] versturen mislukt", { status });
          }
        }
      })
    );
  } catch (e) {
    console.error("[push] onverwachte fout", e instanceof Error ? e.message : e);
  }
  return { verstuurd };
}

// Na het antwoord: een nieuwe lead melden.
export function planLeadPush(companyId: string, lead: { naam: string; werk: string; bedrag: string; id: string }) {
  if (!pushBeschikbaar()) return;
  const werk = () =>
    stuurPush(companyId, {
      titel: "Nieuwe aanvraag",
      tekst: `${lead.naam} · ${lead.werk} · ${lead.bedrag}`,
      url: `/dashboard/leads?lead=${lead.id}`,
    }).then(() => undefined);
  try {
    after(werk);
  } catch {
    void werk();
  }
}
