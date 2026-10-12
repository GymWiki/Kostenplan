import "server-only";
import { prismaBasis } from "@/app/lib/prisma";
import type { OfferteV2Status } from "@/app/generated/prisma/client";
import type { OfferteInhoud } from "./model";
import { weergaveStatusV2 } from "./status";

export type PubliekeOfferte = {
  id: string;
  companyId: string;
  leadId: string | null;
  token: string;
  status: OfferteV2Status; // zoals opgeslagen
  weergaveStatus: OfferteV2Status; // met lazy verval
  nummer: string;
  // De getoonde versie (laatste verstuurde, of de gevraagde als die bestaat).
  versie: number;
  inhoud: OfferteInhoud;
  laatsteVersie: number;
  nieuwer: boolean;
  akkoord: { naam: string; tijdstip: Date; versieNummer: number; heeftPdf: boolean; gekozenRegelIds: string[] } | null;
};

// Laadt een offerte voor de publieke pagina. Een concept (nooit verstuurd) bestaat voor de klant niet.
export async function laadPubliekeOfferte(token: string, gevraagdeVersie?: number): Promise<PubliekeOfferte | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const o = await prismaBasis.offerteV2.findUnique({
    where: { token },
    include: {
      // Zichtbaar voor de klant zodra de PDF klaarstaat (gedeeld) of de versie is verstuurd.
      versies: { where: { OR: [{ vergrendeld: true }, { pdfHash: { not: null } }] }, orderBy: { versie: "desc" }, omit: { pdfData: true } },
      akkoorden: { omit: { getekendePdfData: true } },
    },
  });
  if (!o || o.versies.length === 0) return null;
  const laatste = o.versies[0];
  const gekozen = gevraagdeVersie ? o.versies.find((v) => v.versie === gevraagdeVersie) : undefined;
  const v = gekozen ?? laatste;
  const inhoud = v.inhoud as unknown as OfferteInhoud;
  const ak = o.akkoorden[0];
  const heeftPdf = ak ? Boolean(await prismaBasis.offerteAkkoord.count({ where: { id: ak.id, getekendePdfData: { not: null } } })) : false;
  return {
    id: o.id,
    companyId: o.companyId,
    leadId: o.leadId,
    token: o.token,
    // Een gedeelde offerte die de hovenier nog niet als verstuurd bevestigde, telt voor de klant als verstuurd.
    status: o.status === "CONCEPT" ? "VERSTUURD" : o.status,
    weergaveStatus: weergaveStatusV2({ status: o.status === "CONCEPT" ? "VERSTUURD" : o.status, geldigTot: (laatste.inhoud as unknown as OfferteInhoud).geldigTot }),
    nummer: o.nummer,
    versie: v.versie,
    inhoud,
    laatsteVersie: laatste.versie,
    nieuwer: v.versie < laatste.versie,
    akkoord: ak ? { naam: ak.naam, tijdstip: ak.tijdstip, versieNummer: ak.versieNummer, heeftPdf, gekozenRegelIds: ak.gekozenRegelIds as string[] } : null,
  };
}

const BOT = /bot|crawler|spider|preview|whatsapp|facebookexternalhit|slackbot|skypeuripreview|googleimageproxy|mailscanner|barracuda|proofpoint|safelinks|curl|wget|headless/i;
export const isWaarschijnlijkBot = (userAgent: string | null) => !userAgent || BOT.test(userAgent);
