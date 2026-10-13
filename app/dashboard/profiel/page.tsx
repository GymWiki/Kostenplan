import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell, Building2, CreditCard, FileText, MapPin, Palette, SlidersHorizontal, UserRound } from "lucide-react";
import { InstellingenKolom, SettingsGroup, SettingsRow } from "@/app/components/instellingen/settings";
import { ontbrekendeVerplichteGegevens } from "@/app/lib/offerte/gegevens";
import { abonnementRegel, domeinVan, ontbreektTekst, planKort, tarievenRegel, werkgebiedRegel } from "@/app/lib/profiel/samenvattingen";
import { effectiveTier } from "@/app/lib/subscription";
import { prisma } from "@/app/lib/prisma";
import { laadAbonnementInvoer, laadProfiel, laadTarieven } from "@/app/lib/profiel/laad";
import { pushBeschikbaar } from "@/app/lib/push/versturen";
import { ProfielKop } from "./profiel-kop";
import { UitloggenRij } from "./uitloggen-rij";

export const metadata: Metadata = { title: "Profiel" };

// Oude adressen (/dashboard/profiel?scherm=…) sturen door naar de nieuwe pagina's.
const OUD: Record<string, string> = {
  bedrijf: "bedrijfsgegevens",
  bedrijfsgegevens: "bedrijfsgegevens",
  offertegegevens: "bedrijfsgegevens",
  uiterlijk: "huisstijl",
  tarieven: "tarieven",
  werkgebied: "werkgebied",
  abonnement: "abonnement",
  meldingen: "meldingen",
  account: "account",
};

export default async function ProfielPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const scherm = typeof params.scherm === "string" ? params.scherm : null;
  if (scherm && OUD[scherm]) {
    const rest = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (k !== "scherm" && typeof v === "string") rest.set(k, v);
    redirect(`/dashboard/profiel/${OUD[scherm]}${rest.size ? `?${rest}` : ""}`);
  }

  const { user, company, alleBedrijven, tools, offertegegevens, werkgebied } = await laadProfiel();
  const [tarieven, abonnementInvoer] = await Promise.all([laadTarieven(company, tools[0]?.id), laadAbonnementInvoer(company)]);
  const abonnement = abonnementRegel(abonnementInvoer);
  const ontbreekt = ontbrekendeVerplichteGegevens(offertegegevens).length;
  const logoUrl = tools.map((t) => t.branding?.logoUrl).find(Boolean) ?? offertegegevens.logoUrl ?? null;
  // Logo per bedrijf voor de bedrijfswisselaar (het eerste logo van een rekentool van dat bedrijf).
  const logos = await prisma.tool.findMany({ where: { companyId: { in: alleBedrijven.map((b) => b.id) }, deletedAt: null }, orderBy: { createdAt: "asc" }, select: { companyId: true, branding: { select: { logoUrl: true } } } });
  const logoVan = (id: string) => (id === company.id ? logoUrl : (logos.find((t) => t.companyId === id && t.branding?.logoUrl)?.branding?.logoUrl ?? null));
  const wisselBedrijven = alleBedrijven.map((b) => ({ id: b.id, naam: b.naam, logoUrl: logoVan(b.id), plan: planKort({ plan: effectiveTier(b), status: b.subscriptionStatus, handmatigToegekend: b.overrideTier !== null }) }));
  const kleuren = [...new Set(tools.map((t) => t.branding?.primaireKleur).filter((k): k is string => Boolean(k)))].slice(0, 3);

  return (
    <InstellingenKolom>
      <h1 className="hidden text-2xl font-semibold text-foreground md:block">Profiel</h1>
      <ProfielKop key={company.id} actief={wisselBedrijven.find((b) => b.id === company.id)!} domein={domeinVan(offertegegevens.website)} bedrijven={wisselBedrijven} />

      <SettingsGroup kop="Je bedrijf">
        <SettingsRow href="/dashboard/profiel/bedrijfsgegevens" icoon={Building2} titel="Bedrijfsgegevens" samenvatting="Naam, adres, KvK, contact" waarschuwing={ontbreektTekst(ontbreekt)} />
        <SettingsRow
          href="/dashboard/profiel/huisstijl"
          icoon={Palette}
          titel="Huisstijl & logo"
          rechts={
            <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
              {kleuren.map((k) => (
                <span key={k} className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: k }} />
              ))}
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- extern logo
                <img src={logoUrl} alt="" width={28} height={28} className="h-7 w-7 rounded border border-border bg-white object-contain" />
              )}
            </span>
          }
        />
      </SettingsGroup>

      <SettingsGroup kop="Prijzen en aanvragen">
        <SettingsRow href="/dashboard/profiel/tarieven" icoon={SlidersHorizontal} titel="Tarieven" samenvatting={tarievenRegel(tarieven)} />
        <SettingsRow href="/dashboard/profiel/werkgebied" icoon={MapPin} titel="Werkgebied en minimum" samenvatting={werkgebiedRegel(werkgebied)} />
        <SettingsRow href="/dashboard/profiel/offerte-instellingen" icoon={FileText} titel="Offerte-instellingen" samenvatting="Nummering, geldigheid, betaling, standaardteksten" />
      </SettingsGroup>

      <SettingsGroup kop="Abonnement">
        <SettingsRow href="/dashboard/profiel/abonnement" icoon={CreditCard} titel="Abonnement" samenvatting={abonnement.tekst} waarschuwing={abonnement.letOp ? abonnement.tekst : null} />
      </SettingsGroup>

      <SettingsGroup kop="Account">
        <SettingsRow href="/dashboard/profiel/account" icoon={UserRound} titel="Account" samenvatting={user.email} />
        {pushBeschikbaar() && <SettingsRow href="/dashboard/profiel/meldingen" icoon={Bell} titel="Meldingen" samenvatting="Bij een nieuwe aanvraag" />}
        <UitloggenRij />
      </SettingsGroup>
    </InstellingenKolom>
  );
}
