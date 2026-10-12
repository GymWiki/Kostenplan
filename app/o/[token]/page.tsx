import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { OffertePubliek } from "@/app/components/offerte/offerte-publiek";
import { meldHovenier } from "@/app/lib/offerte/meldingen";
import { isWaarschijnlijkBot, laadPubliekeOfferte } from "@/app/lib/offerte/publiek";
import { markeerVerlopen, registreerBekeken } from "@/app/lib/offerte/publiek-acties";

// Nooit indexeren: een token geeft toegang tot de prijsafspraak van één klant.
export const metadata: Metadata = { title: "Jouw offerte", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PubliekeOffertePagina({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ v?: string }> }) {
  const { token } = await params;
  const { v } = await searchParams;
  const o = await laadPubliekeOfferte(token, Number(v) || undefined);
  if (!o) notFound();

  if (o.weergaveStatus === "VERLOPEN" && (o.status === "VERSTUURD" || o.status === "BEKEKEN")) await markeerVerlopen(o.id);

  // Eerste keer openen: registreren en de hovenier melden (niet voor linkpreviews en scanners).
  if (o.status === "VERSTUURD" && !o.nieuwer && !isWaarschijnlijkBot((await headers()).get("user-agent"))) {
    const geregistreerd = await registreerBekeken({ id: o.id, status: o.status, versie: o.versie });
    if (geregistreerd) after(() => meldHovenier({ companyId: o.companyId, leadId: o.leadId, inhoud: o.inhoud, soort: "bekeken" }));
  }

  const a = o.inhoud.afzender;
  return (
    <OffertePubliek
      token={o.token}
      inhoud={o.inhoud}
      status={o.weergaveStatus}
      versie={o.versie}
      laatsteVersie={o.laatsteVersie}
      nieuwer={o.nieuwer}
      akkoord={o.akkoord ? { naam: o.akkoord.naam, tijdstip: o.akkoord.tijdstip.toISOString(), versieNummer: o.akkoord.versieNummer, heeftPdf: o.akkoord.heeftPdf, gekozenRegelIds: o.akkoord.gekozenRegelIds } : null}
      contact={{ naam: a.handelsnaam, telefoon: a.telefoon, email: a.email }}
    />
  );
}
