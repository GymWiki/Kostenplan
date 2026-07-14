import type { Metadata } from "next";
import { Wrench, Package, SlidersHorizontal } from "lucide-react";
import { requireUser } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { getPortalUrl, getEmbedCode } from "@/app/lib/url";
import { effectiveTier, isProTier } from "@/app/lib/subscription";
import { Card, CardContent } from "@/app/components/ui/card";
import { SharePortalCard } from "@/app/components/dashboard/share-portal-card";

export const metadata: Metadata = { title: "Overzicht" };

export default async function DashboardPage() {
  const user = await requireUser();

  const [servicesCount, productsCount, costSettings, portalUrl, embedCode] =
    await Promise.all([
      prisma.service.count({ where: { userId: user.id } }),
      prisma.product.count({ where: { userId: user.id } }),
      prisma.costSettings.findUnique({ where: { userId: user.id } }),
      getPortalUrl(user.slug),
      getEmbedCode(user.slug, user.bedrijfsnaam),
    ]);

  const enabledCostTypes = costSettings
    ? [
        costSettings.arbeidEnabled,
        costSettings.transportEnabled,
        costSettings.voorrijEnabled,
        costSettings.materiaalEnabled,
      ].filter(Boolean).length
    : 0;

  const hasOffering = servicesCount > 0 || productsCount > 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welkom terug, {user.bedrijfsnaam}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Dit is jouw Kostenplan-dashboard. Beheer je calculator en deel de link met klanten.
        </p>
      </div>

      <SharePortalCard
        portalUrl={portalUrl}
        embedCode={embedCode}
        magEmbedden={isProTier(effectiveTier(user))}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={Wrench} label="Diensten" value={servicesCount} href="/dashboard/diensten" />
        <StatCard icon={Package} label="Producten" value={productsCount} href="/dashboard/producten" />
        <StatCard
          icon={SlidersHorizontal}
          label="Actieve kostentypes"
          value={`${enabledCostTypes} / 4`}
          href="/dashboard/instellingen"
        />
      </div>

      {!hasOffering && (
        <Card>
          <CardContent>
            <h2 className="font-semibold text-foreground">Aan de slag</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Je calculator is nog leeg. Volg deze stappen om hem klaar te maken voor klanten:
            </p>
            <ol className="mt-4 flex flex-col gap-3 text-sm">
              <Step
                href="/dashboard/instellingen"
                title="Stel je kostentypes in"
                description="Bepaal je uurtarief, voorrijkosten en transportkosten."
              />
              <Step
                href="/dashboard/diensten"
                title="Voeg diensten toe"
                description="Denk aan tegels leggen, schutting plaatsen of gras zaaien."
              />
              <Step
                href="/dashboard/producten"
                title="Voeg producten toe"
                description="Samengestelde producten zoals een schutting, met materiaalkeuzes en prijzen."
              />
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <a href={href}>
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

function Step({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <li>
      <a
        href={href}
        className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 transition-colors hover:border-primary/40 hover:bg-secondary/50"
      >
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </a>
    </li>
  );
}
