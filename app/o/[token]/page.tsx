import type { Metadata } from "next";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { OffertePubliek } from "@/app/components/offerte/offerte-publiek";
import { meldHovenier } from "@/app/lib/offerte/meldingen";
import { isWaarschijnlijkBot, laadPubliekeOfferte } from "@/app/lib/offerte/publiek";
import { registreerBekeken } from "@/app/lib/offerte/publiek-acties";

// Nooit indexeren: een token geeft toegang tot de prijsafspraak van één klant.
export const dynamic = "force-dynamic";

// Binnen één verzoek hoeft de offerte maar één keer geladen te worden (metadata en pagina).
const laad = cache(laadPubliekeOfferte);

export async function generateMetadata({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ v?: string }> }): Promise<Metadata> {
  const { token } = await params;
  const { v } = await searchParams;
  const o = await laad(token, Number(v) || undefined);
  // Een ongeldige of verwijderde link heet niet "Jouw offerte".
  return { title: o ? "Jouw offerte" : "Offerte niet gevonden", robots: { index: false, follow: false } };
}

export default async function PubliekeOffertePagina({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ v?: string }> }) {
  const { token } = await params;
  const { v } = await searchParams;
  const o = await laad(token, Number(v) || undefined);
  if (!o) notFound();

  // Eerste keer openen: registreren en de hovenier melden (niet voor linkpreviews en scanners).
  if ((o.status === "VERSTUURD" || o.status === "BEKEKEN") && !o.nieuwer && !isWaarschijnlijkBot((await headers()).get("user-agent"))) {
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
