import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getToolCostSettings, requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { NieuwItemButton } from "@/app/components/dashboard/nieuw-item-button";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import { voorbeeldHoeveelheidVoor } from "@/app/lib/werkzaamheid";
import { berekenKostenOpbouw, prijsRange } from "@/app/lib/werkzaamheid-kosten";
import { NieuwMelding } from "./editor/nieuw-melding";
import { WerkzaamheidKaart } from "./editor/werkzaamheid-kaart";

export const metadata: Metadata = { title: "Werkzaamheden" };

export default async function WerkzaamhedenPage({
  params,
  searchParams,
}: {
  params: Promise<{ toolId: string }>;
  searchParams: Promise<{ nieuw?: string }>;
}) {
  const { toolId } = await params;
  const { nieuw } = await searchParams;
  const { company } = await requireActiveTool(toolId);

  const [products, totaalOverAlleTools, costSettings] = await Promise.all([
    prisma.product.findMany({
      where: { toolId },
      orderBy: { order: "asc" },
      // Defensieve bovengrens (geen plan staat vandaag meer dan een paar
      // tientallen werkzaamheden per tool toe).
      take: 200,
      include: {
        materiaalCategorieen: { orderBy: { order: "asc" }, include: { materialen: { orderBy: { order: "asc" } } } },
        extraOpties: { orderBy: { order: "asc" } },
      },
    }),
    prisma.product.count({ where: { tool: { companyId: company.id } } }),
    getToolCostSettings(toolId, company),
  ]);
  const limiet = PLAN_LIMITS[effectiveTier(company)].maxProductsPerCompany;
  const atLimit = limiet !== null && totaalOverAlleTools >= limiet;
  const nieuweNaam = nieuw ? (products.find((p) => p.id === nieuw)?.naam ?? null) : null;

  const nieuwHref = `/dashboard/tools/${toolId}/producten/nieuw`;

  return (
    <div className="flex flex-col gap-6">
      <NieuwMelding naam={nieuweNaam} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold leading-tight text-foreground">Je werkzaamheden</h1>
          <p className="mt-1 text-muted-foreground">
            Dit kunnen klanten uitrekenen op je website. Tik op een werkzaamheid om prijzen aan te passen.
          </p>
        </div>
        <NieuwItemButton href={nieuwHref} label="Werkzaamheid toevoegen" atLimit={atLimit} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {products.map((product) => {
          const preview = { ...product, extraOpties: product.extraOpties.filter((e) => e.actief) };
          const opbouw = berekenKostenOpbouw({
            product: {
              ...preview,
              materiaalCategorieen: preview.materiaalCategorieen.map((c) => ({
                ...c,
                materialen: c.materialen.filter((m) => m.actief),
              })),
            },
            optieId: null,
            hoeveelheid: voorbeeldHoeveelheidVoor(product.eenheid),
            costSettings,
          });
          const range = prijsRange({
            ...preview,
            materiaalCategorieen: preview.materiaalCategorieen.map((c) => ({
              ...c,
              materialen: c.materialen.filter((m) => m.actief),
            })),
          });
          return (
            <WerkzaamheidKaart
              key={product.id}
              toolId={toolId}
              product={product}
              range={range}
              opbouw={opbouw}
              gemarkeerd={product.id === nieuw}
            />
          );
        })}
        {!atLimit && (
          <Link
            href={nieuwHref}
            className="flex min-h-[10rem] flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-input p-5 text-center transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
          >
            <Plus className="h-6 w-6 text-foreground" aria-hidden="true" />
            <span className="font-bold text-foreground">Nieuwe werkzaamheid</span>
            <span className="text-sm text-muted-foreground">Klaar in 3 stappen</span>
          </Link>
        )}
      </div>
    </div>
  );
}
