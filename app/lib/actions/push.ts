"use server";

import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { pushBeschikbaar, stuurPush } from "@/app/lib/push/versturen";

type Uitslag = { ok: true } | { ok: false; error: string };

// Opslaan van een toestel dat meldingen wil — alleen aangeroepen nadat de
// gebruiker zelf op "Meldingen aanzetten" tikte en de browser toestemming gaf.
export async function bewaarPushAbonnementAction(sub: { endpoint: string; p256dh: string; auth: string }): Promise<Uitslag> {
  if (!pushBeschikbaar()) return { ok: false, error: "Meldingen zijn niet beschikbaar." };
  const { user, company } = await requireActiveCompany();
  if (!sub.endpoint.startsWith("https://") || sub.endpoint.length > 1000 || !sub.p256dh || !sub.auth) {
    return { ok: false, error: "Ongeldig toestel." };
  }
  await prisma.pushAbonnement.upsert({
    where: { endpoint: sub.endpoint },
    create: { companyId: company.id, userId: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
    update: { companyId: company.id, userId: user.id, p256dh: sub.p256dh, auth: sub.auth },
  });
  return { ok: true };
}

export async function verwijderPushAbonnementAction(endpoint: string): Promise<Uitslag> {
  const { company } = await requireActiveCompany();
  await prisma.pushAbonnement.deleteMany({ where: { endpoint, companyId: company.id } });
  return { ok: true };
}

// Een testmelding naar alle toestellen van dit bedrijf (knop in Profiel).
export async function stuurTestPushAction(): Promise<{ ok: boolean; verstuurd: number }> {
  const { company } = await requireActiveCompany();
  const r = await stuurPush(company.id, { titel: "Testmelding", tekst: "Meldingen werken. Je hoort het zodra er een aanvraag binnenkomt.", url: "/dashboard/leads" });
  return { ok: r.verstuurd > 0, verstuurd: r.verstuurd };
}
