import { Card, CardContent } from "@/app/components/ui/card";
import { AbonnementView } from "@/app/dashboard/abonnement/abonnement-view";
import { TarievenSectie } from "./tarieven-sectie";
import { OfferteGegevensFormulier } from "./offertegegevens-formulier";
import { WerkgebiedFormulier } from "@/app/components/werkgebied/werkgebied-formulier";
import type { WerkgebiedInstellingen } from "@/app/lib/werkgebied/schema";
import { ontbrekendeVerplichteGegevens, type OfferteGegevensWaarden } from "@/app/lib/offerte/gegevens";
import { UiterlijkOverzicht, type BrandingRegel } from "./uiterlijk-overzicht";
import { AccountForm } from "./account-form";
import { BedrijfOverzicht, type BedrijfOverzichtProps } from "./bedrijf-overzicht";
import { BedrijfsgegevensFormulier } from "./bedrijfsgegevens-formulier";
import { ProfielMobiel } from "./profiel-mobiel";
import { MeldingenPaneel } from "./meldingen-paneel";
import { PLAN_LABELS } from "@/app/lib/subscription";
import { effectiveTier, isBetaaldTier, PRIJZEN } from "@/app/lib/subscription";
import { formatCurrency } from "@/app/lib/format";
import { werkgebiedRegel } from "@/app/lib/profiel/samenvattingen";
import type { Company } from "@/app/generated/prisma/client";

export function ProfielView({
  pushBeschikbaar = false,
  email,
  activeCompanyId,
  companies,
  abonnement,
  tarieven,
  branding,
  offertegegevens,
  werkgebied,
  bedrijfOverzicht,
}: {
  pushBeschikbaar?: boolean;
  email: string;
  activeCompanyId: string;
  companies: Company[];
  abonnement: React.ComponentProps<typeof AbonnementView>;
  tarieven: React.ComponentProps<typeof TarievenSectie>["start"];
  branding: BrandingRegel[];
  offertegegevens: OfferteGegevensWaarden;
  werkgebied: WerkgebiedInstellingen;
  bedrijfOverzicht: Omit<BedrijfOverzichtProps, "modus">;
}) {
  const ontbreekt = ontbrekendeVerplichteGegevens(offertegegevens).length;
  // Alleen echt betaalde, actief lopende abonnementen tellen mee — een
  // handmatige overrideTier kost de gebruiker niets, en GEEN/CANCELED/
  // PENDING/SUSPENDED int niet daadwerkelijk (meer).
  const betaaldeBedrijven = companies.filter(
    (c) =>
      c.overrideTier === null &&
      c.subscriptionStatus === "ACTIVE" &&
      isBetaaldTier(effectiveTier(c))
  );
  const totaalPerMaand = betaaldeBedrijven.reduce((som, c) => {
    const plan = effectiveTier(c) as "PLUS" | "PRO";
    const bedrag = PRIJZEN[plan][c.billingInterval ?? "MAANDELIJKS"];
    const perMaand = c.billingInterval === "JAARLIJKS" ? bedrag / 12 : bedrag;
    return som + perMaand;
  }, 0);

  const actiefBedrijf = companies.find((c) => c.id === activeCompanyId);
  const eenheidWoord = tarieven.eenheid === "UUR" ? "uur" : tarieven.eenheid === "DAG" ? "dag" : "dagdeel";

  return (
    <>
    <ProfielMobiel
      meldingenBeschikbaar={pushBeschikbaar}
      samenvattingen={{
        tarieven: `${formatCurrency(tarieven.tarief)} per ${eenheidWoord}`,
        werkgebied: werkgebiedRegel(werkgebied),
        bedrijf: actiefBedrijf?.naam ?? "Je bedrijf",
        bedrijfsgegevens: "Naam, adres, KvK, contact",
        offertegegevens: ontbreekt === 0 ? "Compleet" : `${ontbreekt} ${ontbreekt === 1 ? "gegeven" : "gegevens"} ontbreken`,
        uiterlijk: branding.length === 1 ? "Logo en kleuren" : `${branding.length} rekentools`,
        abonnement: PLAN_LABELS?.[abonnement.effectivePlan] ?? String(abonnement.effectivePlan),
        meldingen: "Bij een nieuwe aanvraag",
        account: email,
      }}
      schermen={{
        tarieven: (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Eén keer instellen, geldt voor al je rekentools.</p>
            <TarievenSectie start={tarieven} />
          </section>
        ),
        werkgebied: (
          <section className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Alleen aanvragen binnen je werkgebied en boven een minimumbedrag. Per rekentool kun je afwijken.</p>
            <WerkgebiedFormulier bereik={{ soort: "bedrijf" }} start={werkgebied} />
          </section>
        ),
        bedrijf: <BedrijfOverzicht modus="mobiel" {...bedrijfOverzicht} />,
        bedrijfsgegevens: actiefBedrijf ? (
          <Card>
            <CardContent>
              <BedrijfsgegevensFormulier company={actiefBedrijf} />
            </CardContent>
          </Card>
        ) : null,
        offertegegevens: <OfferteGegevensFormulier start={offertegegevens} />,
        uiterlijk: <UiterlijkOverzicht regels={branding} />,
        abonnement: <AbonnementView {...abonnement} />,
        meldingen: <MeldingenPaneel />,
        account: (
          <Card>
            <CardContent>
              <AccountForm email={email} />
            </CardContent>
          </Card>
        ),
      }}
    />
    <div className="hidden flex-col gap-8 md:flex">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profiel</h1>
        <p className="mt-1 text-muted-foreground">
          Beheer je accountgegevens en al je bedrijven op één plek.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Accountgegevens</h2>
        <Card>
          <CardContent>
            <AccountForm email={email} />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Bedrijf</h2>
        {betaaldeBedrijven.length > 1 && (
          <p className="max-w-[640px] rounded-md border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground">
            Je betaalt nu {formatCurrency(totaalPerMaand)}/maand over {betaaldeBedrijven.length} bedrijven.
          </p>
        )}
        <BedrijfOverzicht modus="desktop" {...bedrijfOverzicht} />
      </section>

      {actiefBedrijf && (
        <section className="flex flex-col gap-3">
          <h2 id="bedrijfsgegevens" className="scroll-mt-20 text-lg font-semibold text-foreground">Bedrijfsgegevens</h2>
          <Card className="max-w-[640px]">
            <CardContent>
              <BedrijfsgegevensFormulier company={actiefBedrijf} />
            </CardContent>
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 id="tarieven" className="scroll-mt-20 text-lg font-semibold text-foreground">Tarieven</h2>
        <p className="-mt-2 text-sm text-muted-foreground">Eén keer instellen, geldt voor al je rekentools.</p>
        <TarievenSectie start={tarieven} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 id="werkgebied" className="scroll-mt-20 text-lg font-semibold text-foreground">Werkgebied en minimum</h2>
        <p className="-mt-2 text-sm text-muted-foreground">Alleen aanvragen binnen je werkgebied en boven een minimumbedrag. Per rekentool kun je afwijken; dat doe je in de rekentool zelf.</p>
        <Card>
          <CardContent>
            <WerkgebiedFormulier bereik={{ soort: "bedrijf" }} start={werkgebied} />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 id="offertegegevens" className="scroll-mt-20 text-lg font-semibold text-foreground">Offertegegevens</h2>
        <p className="-mt-2 text-sm text-muted-foreground">Deze gegevens staan op elke offerte. Zonder KvK-nummer, adres en IBAN kun je geen offerte versturen.</p>
        <Card>
          <CardContent>
            <OfferteGegevensFormulier start={offertegegevens} />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 id="uiterlijk" className="scroll-mt-20 text-lg font-semibold text-foreground">Uiterlijk van je rekentools</h2>
        <UiterlijkOverzicht regels={branding} />
      </section>

      <section>
        <AbonnementView {...abonnement} />
      </section>
    </div>
    </>
  );
}
