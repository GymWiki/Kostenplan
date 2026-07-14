import type { Metadata } from "next";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { LegalSection } from "@/app/components/marketing/legal-section";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacybeleidPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 sm:py-20">
        <div className="border-b border-border pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            Privacy Policy Kostenplan
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Laatst gewijzigd: 14 juli 2026</p>
        </div>

        <p className="mt-8 text-base leading-relaxed text-foreground/90">
          Kostenplan (onderdeel van GymWiki, KVK: 97351911) hecht grote waarde aan de
          bescherming van persoonsgegevens. In dit document leggen wij uit hoe wij omgaan met
          data. Wij opereren in twee rollen volgens de AVG: als Verwerkingsverantwoordelijke
          voor onze eigen klanten, en als Verwerker voor de leads van onze klanten.
        </p>

        <div className="mt-10 flex flex-col gap-10">
          <LegalSection title="1. Gegevens die wij verzamelen als Verwerkingsverantwoordelijke">
            <p>
              Wanneer u een account bij ons aanmaakt, verwerken wij uw bedrijfsgegevens, naam,
              e-mailadres, KVK-nummer, BTW-nummer en betaalgegevens. Wij gebruiken deze
              gegevens uitsluitend om de overeenkomst uit te voeren, facturen te sturen,
              support te leveren en u te informeren over belangrijke updates van ons platform.
            </p>
          </LegalSection>

          <LegalSection title="2. Gegevens die wij verzamelen als Verwerker (Lead Capture)">
            <p>
              Onze applicatie stelt u in staat om gegevens van uw potentiële klanten (leads) te
              verzamelen, zoals namen, e-mailadressen, telefoonnummers en gekozen
              prijsindicaties. Voor deze data bent u de Verwerkingsverantwoordelijke. Kostenplan
              slaat deze gegevens veilig op en toont deze in uw dashboard. Wij zullen deze
              gegevens nimmer voor eigen (commerciële) doeleinden gebruiken, verkopen of
              benaderen.
            </p>
          </LegalSection>

          <LegalSection title="3. Delen van gegevens met derden">
            <p>
              Wij delen persoonsgegevens alleen met derden als dit noodzakelijk is voor de
              uitvoering van onze dienstverlening. Denk hierbij aan onze hostingprovider
              (Supabase) en onze betaalprovider. Met deze partijen hebben wij strikte
              verwerkersovereenkomsten afgesloten om de veiligheid van de data te waarborgen.
            </p>
          </LegalSection>

          <LegalSection title="4. Beveiliging en Bewaartermijn">
            <p>
              Kostenplan neemt passende technische en organisatorische maatregelen om
              persoonsgegevens te beveiligen tegen verlies of onrechtmatige verwerking. Wij
              bewaren klantgegevens zolang u een actief account heeft. Na opzegging van uw
              account worden uw gegevens en de door u verzamelde leads binnen 30 dagen
              permanent verwijderd, tenzij een wettelijke verplichting (zoals de fiscale
              bewaarplicht van 7 jaar) ons verplicht bepaalde facturatiegegevens langer te
              bewaren.
            </p>
          </LegalSection>

          <LegalSection title="5. Uw rechten">
            <p>
              U heeft het recht om uw persoonsgegevens in te zien, te corrigeren of te
              verwijderen. Daarnaast kunt u bezwaar maken tegen de verwerking van uw gegevens.
              Verzoeken hiertoe kunt u richten aan{" "}
              <a
                href="mailto:gymwiki25@gmail.com"
                className="font-medium text-primary hover:underline"
              >
                gymwiki25@gmail.com
              </a>
              . Wij zullen zo snel mogelijk op uw verzoek reageren.
            </p>
          </LegalSection>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
