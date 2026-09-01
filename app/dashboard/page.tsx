import type { Metadata } from "next";
import Link from "next/link";
import { Wrench, Package, Users, ArrowRight } from "lucide-react";
import { requireActiveCompany } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { bouwOnboardingStappen } from "@/app/lib/onboarding";
import { Card, CardContent } from "@/app/components/ui/card";
import { LinkButton } from "@/app/components/ui/button";
import { OnboardingChecklist } from "@/app/components/dashboard/onboarding-checklist";
import { RecenteAanvragen } from "@/app/components/dashboard/recente-aanvragen";

export const metadata: Metadata = { title: "Overzicht" };

export default async function DashboardPage() {
  const { company } = await requireActiveCompany();

  const [toolsCount, publishedTool, productsCount, leadsCount, nieuweLeadsCount, recenteLeads] = await Promise.all([
    prisma.tool.count({ where: { companyId: company.id, deletedAt: null } }),
    prisma.tool.findFirst({
      where: { companyId: company.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, status: true },
    }),
    prisma.product.count({ where: { tool: { companyId: company.id } } }),
    prisma.lead.count({ where: { companyId: company.id } }),
    prisma.lead.count({ where: { companyId: company.id, status: "NIEUW" } }),
    // UX-audit punt 5: hergebruikt de Lead-tabel die hierboven ook al voor
    // leadsCount wordt geteld — geen nieuwe databron, alleen de laatste 5
    // rijen in plaats van enkel een aantal.
    prisma.lead.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, naam: true, toolNaamSnapshot: true, status: true, totaalIndicatie: true, createdAt: true },
    }),
  ]);
  const heeftGepubliceerdeTool =
    publishedTool?.status === "GEPUBLICEERD" ||
    (await prisma.tool.count({ where: { companyId: company.id, deletedAt: null, status: "GEPUBLICEERD" } })) > 0;

  // Onboarding-checklist: alle drie stappen live afgeleid van bestaande data
  // (zie app/lib/onboarding.ts) — geen aparte "voltooid"-vlaggen om te laten
  // verlopen.
  const onboardingStappen = bouwOnboardingStappen({
    heeftRekentool: toolsCount > 0,
    heeftCatalogusItem: productsCount > 0,
    heeftGepubliceerdeTool,
    eersteToolHref: publishedTool ? `/dashboard/tools/${publishedTool.id}` : "/dashboard/tools",
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
          Dit is jouw Kostenplan-dashboard. Beheer je rekentools en deel ze met klanten.
        </p>
      </div>

      {toonOnboarding && (
        <OnboardingChecklist stappen={onboardingStappen} justCompleted={justCompletedOnboarding} />
      )}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <StatCard icon={Wrench} label="Rekentools" value={toolsCount} href="/dashboard/tools" />
        <StatCard icon={Package} label="Producten (alle tools)" value={productsCount} href="/dashboard/tools" />
        <StatCard
          icon={Users}
          label="Leads"
          value={leadsCount}
          href="/dashboard/leads"
          badge={nieuweLeadsCount > 0 ? `${nieuweLeadsCount} nieuw${nieuweLeadsCount > 1 ? "e" : ""}` : undefined}
        />
      </div>

      {/* UX-audit punt 5: op brede schermen liet dit vroeger een groot leeg
          vlak naast/onder deze ene kaart staan — de tweekoloms-grid hier
          gebruikt die breedte nu voor de recente-aanvragen-lijst hiernaast. */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <RecenteAanvragen
          aanvragen={recenteLeads}
          toonTool={toolsCount > 1}
          bekijkAlleHref="/dashboard/leads"
        />

        <Card className="border-primary/20 bg-gradient-to-br from-accent to-card">
          <CardContent className="flex h-full flex-col justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Mijn rekentools</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Elke rekentool heeft zijn eigen producten, prijzen, huisstijl en publieke link — beheer ze
                allemaal op één plek.
              </p>
            </div>
            <LinkButton href="/dashboard/tools" className="shrink-0 self-start">
              Naar mijn rekentools
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </LinkButton>
          </CardContent>
        </Card>
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
    <Link href={href} className="relative block">
      {badge && (
        <span className="animate-soft-pulse absolute -top-2 -right-2 z-10 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground shadow-sm">
          {badge}
        </span>
      )}
      <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-16px_rgba(15,23,42,0.22)]">
        <CardContent className="flex items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            {/* Elk getal in Kostenplan is uiteindelijk een kostenindicatie —
                daarom hier bewust groter, met tabular-nums/tracking-tight
                (voorkomt "wiebelende" cijfers) i.p.v. dezelfde gewicht als de
                label eronder. */}
            <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
