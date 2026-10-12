import "server-only";
import { prismaBasis } from "@/app/lib/prisma";
import { verstuurBrevoMail } from "@/app/lib/mail/brevo";
import { publiekeOfferteLink } from "./links";
import { bouwOfferteMail } from "./mail";
import type { OfferteInhoud } from "./model";

// Dagelijks onderhoud van openstaande offertes: verlopen markeren en (als de hovenier dat
// aanzette) de klant X dagen voor het verlopen een herinnering sturen.
export async function offerteOnderhoud(basisUrl: string, nu: Date = new Date()): Promise<{ verlopen: number; herinneringen: number }> {
  const verlopen = await prismaBasis.offerteV2.updateMany({ where: { status: { in: ["VERSTUURD", "BEKEKEN"] }, geldigTot: { lt: nu } }, data: { status: "VERLOPEN" } });

  let herinneringen = 0;
  const kandidaten = await prismaBasis.offerteV2.findMany({
    where: { status: { in: ["VERSTUURD", "BEKEKEN"] }, herinneringVerstuurdOp: null, geldigTot: { gt: nu } },
    select: { id: true, token: true, geldigTot: true, companyId: true, huidigeVersie: true, company: { select: { offerteGegevens: { select: { herinneringDagen: true } } } } },
    take: 200,
  });
  for (const o of kandidaten) {
    const dagen = o.company.offerteGegevens?.herinneringDagen;
    if (dagen == null || !o.geldigTot) continue;
    if (o.geldigTot.getTime() - nu.getTime() > dagen * 86_400_000) continue;
    const v = await prismaBasis.offerteVersie.findFirst({ where: { offerteId: o.id, vergrendeld: true }, orderBy: { versie: "desc" }, omit: { pdfData: true } });
    if (!v) continue;
    const inhoud = v.inhoud as unknown as OfferteInhoud;
    // Eerst markeren (conditioneel), zodat een tweede run nooit dubbel mailt.
    const claim = await prismaBasis.offerteV2.updateMany({ where: { id: o.id, herinneringVerstuurdOp: null }, data: { herinneringVerstuurdOp: nu } });
    if (claim.count !== 1) continue;
    const mail = bouwOfferteMail({ inhoud, link: publiekeOfferteLink(basisUrl, o.token), herinnering: true });
    const r = await verstuurBrevoMail({
      afzenderNaam: inhoud.afzender.handelsnaam,
      naar: { email: inhoud.klant.email, naam: inhoud.klant.naam },
      replyTo: inhoud.afzender.email ? { email: inhoud.afzender.email, naam: inhoud.afzender.contactNaam || inhoud.afzender.handelsnaam } : undefined,
      onderwerp: mail.onderwerp,
      tekst: mail.tekst,
      html: mail.html,
    });
    if (r.ok) {
      herinneringen += 1;
      await prismaBasis.offerteGebeurtenis.create({ data: { offerteId: o.id, versieNummer: v.versie, soort: "HERINNERING", tekst: `herinnering aan ${inhoud.klant.email}` } });
    } else {
      await prismaBasis.offerteV2.updateMany({ where: { id: o.id }, data: { herinneringVerstuurdOp: null } });
    }
  }
  return { verlopen: verlopen.count, herinneringen };
}
