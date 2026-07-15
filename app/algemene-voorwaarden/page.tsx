import type { Metadata } from "next";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { LegalSection } from "@/app/components/marketing/legal-section";

export const metadata: Metadata = {
  title: "Algemene Voorwaarden",
  description:
    "Lees de algemene voorwaarden van Kostenplan, de offertecalculator voor hoveniers en andere vakmensen.",
  alternates: { canonical: "/algemene-voorwaarden" },
};

export default function AlgemeneVoorwaardenPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 sm:py-20">
        <div className="border-b border-border pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            Algemene Voorwaarden Kostenplan
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Laatst gewijzigd: 14 juli 2026</p>
        </div>

        <div className="mt-10 flex flex-col gap-10">
          <LegalSection title="1. Toepasselijkheid">
            <p>
              Deze algemene voorwaarden zijn van toepassing op alle aanbiedingen,
              overeenkomsten en het gebruik van de SaaS-applicatie &lsquo;Kostenplan&rsquo;,
              een handelsnaam van GymWiki (KVK: 97351911), hierna te noemen &ldquo;Kostenplan&rdquo;.
              Door gebruik te maken van onze dienst, gaat u akkoord met deze voorwaarden. De
              dienst is uitsluitend gericht op zakelijke gebruikers (B2B).
            </p>
          </LegalSection>

          <LegalSection title="2. De Dienst (SaaS)">
            <p>
              Kostenplan biedt een online rekentool en lead-kwalificatiesysteem waarmee
              vakmensen prijsindicaties kunnen geven aan hun potentiële klanten. Kostenplan
              spant zich in om de applicatie 24/7 beschikbaar te houden, maar garandeert geen
              ononderbroken beschikbaarheid. Onderhoud en updates kunnen leiden tot tijdelijke
              onbeschikbaarheid.
            </p>
          </LegalSection>

          <LegalSection title="3. Prijzen, Abonnementen en Opzegging">
            <p>
              Kostenplan wordt aangeboden in verschillende abonnementsvormen (Gratis, Plus,
              Pro). Betaalde abonnementen worden vooraf per maand gefactureerd. Een abonnement
              is maandelijks opzegbaar via het dashboard in de applicatie, tot uiterlijk één
              dag voor de nieuwe factuurperiode. Prijswijzigingen worden minimaal één maand van
              tevoren gecommuniceerd.
            </p>
          </LegalSection>

          <LegalSection title="4. Aansprakelijkheid">
            <p>
              Kostenplan levert uitsluitend de software om berekeningen en lead-generatie te
              faciliteren. Kostenplan is nimmer partij bij overeenkomsten die voortvloeien uit
              het gebruik van de tool tussen de gebruiker (de vakman) en diens eindklant.
            </p>
            <p>
              Kostenplan is niet aansprakelijk voor de juistheid van de prijsindicaties,
              calculatiefouten, misgelopen inkomsten of geschillen tussen u en uw klanten. De
              totale aansprakelijkheid van Kostenplan wegens toerekenbare tekortkoming in de
              nakoming van de overeenkomst is beperkt tot de vergoeding van directe schade tot
              maximaal het bedrag dat u in de drie maanden voorafgaand aan de schadebrengende
              gebeurtenis aan Kostenplan heeft betaald.
            </p>
          </LegalSection>

          <LegalSection title="5. Intellectueel Eigendom">
            <p>
              Alle rechten van intellectueel eigendom op de applicatie, inclusief de
              onderliggende code, het design en de functionaliteiten, berusten exclusief bij
              Kostenplan. U krijgt slechts een niet-exclusief, niet-overdraagbaar recht om de
              software te gebruiken gedurende de looptijd van uw abonnement. Gegevens en leads
              die u via de applicatie verzamelt, blijven uw volledige eigendom.
            </p>
          </LegalSection>

          <LegalSection title="6. Toepasselijk recht">
            <p>
              Op deze overeenkomst is uitsluitend Nederlands recht van toepassing. Geschillen
              zullen worden voorgelegd aan de bevoegde rechter in het arrondissement waar
              Kostenplan is gevestigd.
            </p>
          </LegalSection>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
