import Link from "next/link";
import { AlertTriangle, ChevronRight, Ruler } from "lucide-react";
import { LinkButton } from "@/app/components/ui/button";
import { PRODUCT_ICONS } from "@/app/lib/icons";
import { cn } from "@/app/lib/cn";
import { kortEenheid, methodeLabel, methodeVanProduct, type ProductMetRelaties } from "@/app/lib/werkzaamheid";
import type { KostenOpbouw } from "@/app/lib/werkzaamheid-kosten";
import { ZichtbaarheidSwitch } from "./zichtbaarheid-switch";

// Overzichtsbedragen zonder onnodige decimalen: € 38 – € 62, € 1.670.
const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const getal = (n: number) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(n);

// Overzichtskaart van één werkzaamheid: icoon, naam, rekenmethode, prijsrange,
// "20 m kost je klant €X", zichtbaarheid en bewerken. Waarschuwt zolang er nog
// voorbeeldprijzen in staan.
export function WerkzaamheidKaart({
  toolId,
  product,
  range,
  opbouw,
  gemarkeerd,
}: {
  toolId: string;
  product: ProductMetRelaties;
  range: { min: number; max: number } | null;
  opbouw: KostenOpbouw;
  gemarkeerd: boolean;
}) {
  const Icoon = (product.icoon && PRODUCT_ICONS[product.icoon]) || Ruler;
  const materialen = product.materiaalCategorieen[0]?.materialen.filter((m) => m.actief) ?? [];
  const heeftVoorbeeld = materialen.some((m) => m.isVoorbeeld);
  const eenheid = kortEenheid(product.eenheid);
  const bewerkHref = `/dashboard/tools/${toolId}/producten/${product.id}/bewerken`;

  return (
    <article
      aria-labelledby={`kaart-${product.id}`}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5",
        gemarkeerd ? "border-primary ring-[3px] ring-ring/35" : "border-border"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <Icoon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`kaart-${product.id}`} className="break-words text-lg font-bold leading-tight text-foreground">
            <Link href={bewerkHref} className="hover:underline">
              {product.naam}
            </Link>
          </h2>
          <p className="text-sm text-muted-foreground">
            {methodeLabel(methodeVanProduct(product))} · {materialen.length} {materialen.length === 1 ? "materiaal" : "materialen"}
          </p>
        </div>
        {gemarkeerd && (
          <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">Nieuw</span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2.5">
        <div className="min-w-0 rounded-lg bg-muted px-3 py-2.5">
          <dt className="text-sm text-muted-foreground">Materiaal</dt>
          <dd className="break-words text-sm font-bold text-foreground">
            {range ? (
              <>
                {range.min === range.max ? euro(range.min) : `${euro(range.min)} – ${euro(range.max)}`}
                <span className="font-normal text-muted-foreground"> / {eenheid}</span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="min-w-0 rounded-lg bg-muted px-3 py-2.5">
          <dt className="text-sm text-muted-foreground">
            {getal(opbouw.hoeveelheid)} {eenheid} kost
          </dt>
          <dd className="text-sm font-bold text-foreground">{euro(opbouw.totaal)}</dd>
        </div>
      </dl>

      {heeftVoorbeeld && (
        <p className="flex items-start gap-2 rounded-lg border border-example bg-example/15 px-3 py-2 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Nog <strong>voorbeeldprijzen</strong>. Controleer ze voor je klanten ze zien.
          </span>
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-3">
        <ZichtbaarheidSwitch productId={product.id} naam={product.naam} actief={product.actief} />
        <LinkButton href={bewerkHref} variant="outline" className="h-11 border-[1.5px] border-input px-4">
          Bewerken
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </LinkButton>
      </div>
    </article>
  );
}
