import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { effectiveTier } from "@/app/lib/subscription";
import { fontFamilyFor } from "@/app/lib/fonts";
import { weergaveOfferteStatus, type OfferteRegel } from "@/app/lib/offertes";
import { syncOfferteVerval } from "@/app/lib/actions/offertes";
import { OffertePresentatie } from "./offerte-presentatie";

// Nooit indexeren — een geldig deelToken geeft toegang tot de individuele
// prijsafspraak van één specifieke klant, dat hoort niet in zoekresultaten
// terecht te komen (los van het feit dat het token zelf al onraadbaar is).
export const metadata: Metadata = {
  title: "Jouw offerte",
  robots: { index: false, follow: false },
};

// Zelfde standaardkleuren als het klantenportaal (calculator.tsx) — moet
// gelijk blijven aan --primary/--background in globals.css.
const STANDAARD_PRIMAIRE_KLEUR = "#15803d";
const STANDAARD_ACHTERGRONDKLEUR = "#f7faf8";

async function getOfferteData(token: string) {
  const offerte = await prisma.offerte.findUnique({
    where: { deelToken: token },
    include: {
      lead: {
        include: {
          company: {
            include: {
              branding: true,
              costSettings: { select: { btwPercentage: true } },
              creator: { select: { email: true } },
            },
          },
        },
      },
    },
  });
  if (!offerte) return null;

  const actueel = await syncOfferteVerval(offerte);
  return { ...offerte, status: actueel.status };
}

export default async function PubliekeOffertePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const offerte = await getOfferteData(token);
  if (!offerte) notFound();

  const { lead } = offerte;
  const { company } = lead;
  const branding = company.branding;

  // Kleuren/lettertype/logo zijn een Plus/Pro-feature — zelfde afdwinging als
  // op het klantenportaal (calculator.tsx), voor het geval een bedrijf sinds
  // het versturen van deze offerte is teruggevallen op Gratis.
  const magPersonaliserenUiterlijk = effectiveTier(company) !== "GRATIS";

  return (
    <OffertePresentatie
      deelToken={token}
      bedrijfsnaam={company.naam}
      klantNaam={lead.naam}
      logoUrl={magPersonaliserenUiterlijk ? (branding?.logoUrl ?? null) : null}
      primaireKleur={
        magPersonaliserenUiterlijk ? (branding?.primaireKleur ?? STANDAARD_PRIMAIRE_KLEUR) : STANDAARD_PRIMAIRE_KLEUR
      }
      achtergrondKleur={
        magPersonaliserenUiterlijk
          ? (branding?.achtergrondKleur ?? STANDAARD_ACHTERGRONDKLEUR)
          : STANDAARD_ACHTERGRONDKLEUR
      }
      fontFamily={fontFamilyFor(magPersonaliserenUiterlijk ? (branding?.lettertype ?? "MODERN") : "MODERN")}
      regels={offerte.regels as unknown as OfferteRegel[]}
      introTekst={offerte.introTekst}
      voorwaardenTekst={offerte.voorwaardenTekst}
      geldigTot={offerte.geldigTot}
      gereageerdOp={offerte.gereageerdOp}
      updatedAt={offerte.updatedAt}
      btwPercentage={company.costSettings?.btwPercentage ?? 21}
      status={weergaveOfferteStatus(offerte)}
      nietBereikbaarVoorKlant={lead.status === "EXTERN_AFGEHANDELD"}
      contactEmail={branding?.toonEmail ? company.creator.email : null}
      contactTelefoonnummer={branding?.toonTelefoonnummer ? branding.telefoonnummer : null}
    />
  );
}
