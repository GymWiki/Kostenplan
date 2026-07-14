import { Plus } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { LinkButton } from "@/app/components/ui/button";
import { AccountForm } from "./account-form";
import { CompanyCard } from "./company-card";
import { effectiveTier, isBetaaldTier, PRIJZEN } from "@/app/lib/subscription";
import { formatCurrency } from "@/app/lib/format";
import type { Company } from "@/app/generated/prisma/client";

export function ProfielView({
  email,
  activeCompanyId,
  companies,
}: {
  email: string;
  activeCompanyId: string;
  companies: Company[];
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
          <h2 className="text-lg font-semibold text-foreground">Mijn bedrijven</h2>
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
    </div>
  );
}
