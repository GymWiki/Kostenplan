import { Plus } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { LinkButton } from "@/app/components/ui/button";
import { HelpTip } from "@/app/components/ui/help-tip";
import { AbonnementView } from "@/app/dashboard/abonnement/abonnement-view";
import { TarievenSectie } from "./tarieven-sectie";
import { UiterlijkOverzicht, type BrandingRegel } from "./uiterlijk-overzicht";
import { AccountForm } from "./account-form";
import { CompanyCard } from "./company-card";
import { effectiveTier, isBetaaldTier, PRIJZEN } from "@/app/lib/subscription";
import { formatCurrency } from "@/app/lib/format";
import type { Company } from "@/app/generated/prisma/client";

export function ProfielView({
  email,
  activeCompanyId,
  companies,
  abonnement,
  tarieven,
  branding,
}: {
  email: string;
  activeCompanyId: string;
  companies: Company[];
  abonnement: React.ComponentProps<typeof AbonnementView>;
  tarieven: React.ComponentProps<typeof TarievenSectie>["start"];
  branding: BrandingRegel[];
}) {
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

  return (
    <div className="flex flex-col gap-8">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            Mijn bedrijven
            <HelpTip contentKey="profiel.multiCompany" />
          </h2>
          <LinkButton href="/dashboard/bedrijven/nieuw" size="sm" variant="outline">
            <Plus className="h-4 w-4" />
            Nieuw bedrijf toevoegen
          </LinkButton>
        </div>

        {betaaldeBedrijven.length > 1 && (
          <p className="rounded-md border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground">
            Je betaalt nu {formatCurrency(totaalPerMaand)}/maand over {betaaldeBedrijven.length}{" "}
            bedrijven.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              isActive={company.id === activeCompanyId}
              isLastCompany={companies.length === 1}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 id="tarieven" className="scroll-mt-20 text-lg font-semibold text-foreground">Tarieven</h2>
        <p className="-mt-2 text-sm text-muted-foreground">Eén keer instellen, geldt voor al je rekentools.</p>
        <TarievenSectie start={tarieven} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 id="uiterlijk" className="scroll-mt-20 text-lg font-semibold text-foreground">Uiterlijk van je rekentools</h2>
        <UiterlijkOverzicht regels={branding} />
      </section>

      <section>
        <AbonnementView {...abonnement} />
      </section>
    </div>
  );
}
