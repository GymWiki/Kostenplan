import type { Metadata } from "next";
import { Wrench, Package, SlidersHorizontal, Users } from "lucide-react";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getPortalUrl, getEmbedCode } from "@/app/lib/url";
import { effectiveTier, isProTier } from "@/app/lib/subscription";
import { bouwOnboardingStappen } from "@/app/lib/onboarding";
import { Card, CardContent } from "@/app/components/ui/card";
import { SharePortalCard } from "@/app/components/dashboard/share-portal-card";
import { OnboardingChecklist } from "@/app/components/dashboard/onboarding-checklist";

export const metadata: Metadata = { title: "Overzicht" };

export default async function DashboardPage() {
  const { company } = await requireActiveCompany();

  const [servicesCount, productsCount, costSettings, branding, portalUrl, embedCode, leadsCount, nieuweLeadsCount] =
    await Promise.all([
      prisma.service.count({ where: { companyId: company.id } }),
      prisma.product.count({ where: { companyId: company.id } }),
      prisma.costSettings.findUnique({
        where: { companyId: company.id },
        select: { arbeidEnabled: true, transportEnabled: true, voorrijEnabled: true, materiaalEnabled: true },
      }),
      prisma.branding.findUnique({
        where: { companyId: company.id },
        select: { logoUrl: true, telefoonnummer: true },
      }),
      getPortalUrl(company.slug),
      getEmbedCode(company.slug, company.naam),
      prisma.lead.count({ where: { companyId: company.id } }),
      prisma.lead.count({ where: { companyId: company.id, status: "NIEUW" } }),
    ]);

  const enabledCostTypes = costSettings
    ? [
        costSettings.arbeidEnabled,
        costSettings.transportEnabled,
        costSettings.voorrijEnabled,
        costSettings.materiaalEnabled,
      ].filter(Boolean).length
    : 0;

  // Onboarding-checklist: de eerste twee stappen live afgeleid van bestaande
  // data (nooit apart opgeslagen, zie schema), de derde expliciet
  // bijgehouden zodra de portaal-link is aangeklikt.
  const onboardingStappen = bouwOnboardingStappen({
    heeftBedrijfsgegevens: Boolean(branding?.logoUrl || branding?.telefoonnummer),
    heeftCatalogusItem: servicesCount + productsCount > 0,
    heeftPortaalBekeken: company.onboardingPortaalBekeken,
    portalUrl,
  });
  const alleStappenVoltooid = onboardingStappen.every((stap) => stap.voltooid);
  let justCompletedOnboarding = false;
  if (alleStappenVoltooid && !company.onboardingVoltooid) {
    await prisma.company.update({ where: { id: company.id }, data: { onboardingVoltooid: true } });
    justCompletedOnboarding = true;
  }
  const toonOnboarding = !company.onboardingVoltooid || justCompletedOnboarding;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welkom terug, {company.naam}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Dit is jouw Kostenplan-dashboard. Beheer je calculator en deel de link met klanten.
        </p>
      </div>

      {toonOnboarding && (
        <OnboardingChecklist stappen={onboardingStappen} justCompleted={justCompletedOnboarding} />
      )}

      <SharePortalCard
        portalUrl={portalUrl}
        embedCode={embedCode}
        magEmbedden={isProTier(effectiveTier(company))}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Wrench} label="Diensten" value={servicesCount} href="/dashboard/diensten" />
        <StatCard icon={Package} label="Producten" value={productsCount} href="/dashboard/producten" />
        <StatCard
          icon={SlidersHorizontal}
          label="Actieve kostentypes"
          value={`${enabledCostTypes} / 4`}
          href="/dashboard/instellingen"
        />
        <StatCard
          icon={Users}
          label="Leads"
          value={leadsCount}
          href="/dashboard/leads"
          badge={nieuweLeadsCount > 0 ? `${nieuweLeadsCount} nieuw${nieuweLeadsCount > 1 ? "e" : ""}` : undefined}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  href: string;
  // Bijv. "2 nieuwe" — trekt de aandacht naar iets dat net is binnengekomen
  // (nu alleen gebruikt voor nieuwe leads), zonder de kaart zelf anders op
  // te bouwen dan de andere statistiek-kaarten.
  badge?: string;
}) {
  return (
    <a href={href} className="relative block">
      {badge && (
        <span className="animate-soft-pulse absolute -top-2 -right-2 z-10 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground shadow-sm">
          {badge}
        </span>
      )}
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="flex items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-semibold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
