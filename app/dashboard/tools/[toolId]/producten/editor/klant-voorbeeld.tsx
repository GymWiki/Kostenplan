"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { ProductCard, brandStijl } from "@/app/portaal/[slug]/calculator";
import { calculateBreakdownRange } from "@/app/lib/calculate";
import { formatCurrencyRange } from "@/app/lib/format";
import { berekenHoeveelheidVoorSjabloon, coerceVeldWaarden, hoeveelheidUitResultaat, klantVeldenVoorSjabloon } from "@/app/lib/sjablonen";
import { cn } from "@/app/lib/cn";
import { voorbeeldHoeveelheidVoor, type PreviewProduct } from "@/app/lib/werkzaamheid";
import type { Branding, CostSettings, SubscriptionTier } from "@/app/generated/prisma/client";
import { useTarieven } from "../../tarieven-context";

// Live klantvoorbeeld: dezelfde ProductCard als in de echte rekentool en
// dezelfde rekenlogica (calculateBreakdownRange), in de kleuren en het
// lettertype van de klant-rekentool (branding hoort alleen hier, nooit in de
// rest van het dashboard). Geen analytics en geen aanvraagformulier: dit is
// een voorbeeld, geen echte bezoeker.
export type KlantVoorbeeldState = ReturnType<typeof useKlantVoorbeeld>;

export function useKlantVoorbeeld(product: PreviewProduct) {
  const [qtyEnkel, setQtyEnkel] = useState(() => voorbeeldHoeveelheidVoor(product.eenheid));
  const [invoer, setInvoer] = useState<Record<string, unknown>>({ lengte: 5, breedte: 4, diepte: 0.1 });
  const [selecties, setSelecties] = useState<Record<string, string>>({});
  const [extraSelecties, setExtraSelecties] = useState<Record<string, number>>({});

  const categorie = product.materiaalCategorieen[0];
  const gekozenId =
    categorie && selecties[categorie.id] && categorie.materialen.some((m) => m.id === selecties[categorie.id])
      ? selecties[categorie.id]
      : (categorie?.materialen[0]?.id ?? null);

  // Hoeveelheid zoals de klant-rekentool 'm afleidt (zie Calculator).
  const qty = useMemo(() => {
    if (product.sjabloon === "ENKELE_HOEVEELHEID") return qtyEnkel;
    const config = (product.sjabloonConfig as Record<string, unknown> | null) ?? {};
    const velden = klantVeldenVoorSjabloon(product.sjabloon, config);
    const resultaat = berekenHoeveelheidVoorSjabloon(product.sjabloon, config, coerceVeldWaarden(velden, invoer));
    return hoeveelheidUitResultaat(resultaat);
  }, [product.sjabloon, product.sjabloonConfig, qtyEnkel, invoer]);

  // Selecties voor alle categorieën: de gekozen optie voor de eerste, de
  // eerste optie voor eventuele andere (bestaande) categorieën.
  const materialSelections = useMemo(() => {
    const m: Record<string, string> = { ...selecties };
    product.materiaalCategorieen.forEach((c, i) => {
      if (i === 0 && gekozenId) m[c.id] = gekozenId;
      else if (!m[c.id] && c.materialen[0]) m[c.id] = c.materialen[0].id;
    });
    return m;
  }, [selecties, gekozenId, product.materiaalCategorieen]);

  return {
    qty,
    gekozenId,
    materialSelections,
    extraSelecties,
    invoer,
    setQtyEnkel,
    setInvoer,
    setSelecties,
    setExtraSelecties,
  };
}

export function KlantVoorbeeld({
  product,
  state,
  branding,
  subscriptionTier,
  className,
}: {
  product: PreviewProduct;
  state: KlantVoorbeeldState;
  branding: Branding | null;
  subscriptionTier: SubscriptionTier;
  className?: string;
}) {
  const { costSettings } = useTarieven();
  const stijl = brandStijl(branding, subscriptionTier);

  const bedrag = useMemo(
    () =>
      calculateBreakdownRange({
        products: [product],
        productQty: { [product.id]: state.qty },
        materialSelections: state.materialSelections,
        extraSelections: state.extraSelecties,
        costSettings: costSettings as CostSettings,
      }),
    [product, state.qty, state.materialSelections, state.extraSelecties, costSettings]
  );

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-sm", className)}>
      <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Eye className="h-4 w-4" aria-hidden="true" />
        Zo ziet je klant het
      </div>
      <div
        data-portal-shell
        className={cn("flex flex-col gap-3 p-3", stijl.fontClasses)}
        style={
          {
            "--brand-primary": stijl.primaireKleur,
            "--brand-primary-foreground": stijl.brandPrimaryForeground,
            backgroundColor: stijl.achtergrondKleur,
            fontFamily: stijl.fontFamily,
          } as React.CSSProperties
        }
      >
        <ProductCard
          product={product}
          costSettings={costSettings}
          qty={state.qty}
          onQtyChange={state.setQtyEnkel}
          sjabloonInvoer={state.invoer}
          onSjabloonInvoerChange={state.setInvoer}
          regelsBedrag={0}
          materialSelections={state.materialSelections}
          onMaterialSelect={(categoryId, optieId) => state.setSelecties((prev) => ({ ...prev, [categoryId]: optieId }))}
          extraSelections={state.extraSelecties}
          onExtraChange={(id, aantal) => state.setExtraSelecties((prev) => ({ ...prev, [id]: aantal }))}
        />
        <div
          className="rounded-xl px-4 py-3"
          style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}
        >
          <p className="text-xs font-bold uppercase tracking-wide opacity-90">Indicatie inclusief arbeid</p>
          <p className="mt-0.5 text-3xl font-bold leading-tight">
            {state.qty > 0 ? formatCurrencyRange(bedrag.subtotaal) : "—"}
          </p>
          <p className="text-xs opacity-90">excl. btw</p>
        </div>
      </div>
    </div>
  );
}
