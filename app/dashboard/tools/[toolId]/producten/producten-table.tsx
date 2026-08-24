"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Pencil, Search } from "lucide-react";
import { Button, LinkButton } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { getProductIcon } from "@/app/lib/icons";
import { unitLabel } from "@/app/lib/units";
import { ActiveToggle } from "@/app/components/dashboard/active-toggle";
import { DeleteButton } from "@/app/components/dashboard/delete-button";
import { cn } from "@/app/lib/cn";
import { copyProductAction, deleteProductAction, toggleProductActiveAction } from "@/app/lib/actions/products";

type ProductRow = {
  id: string;
  naam: string;
  eenheid: string;
  icoon: string | null;
  actief: boolean;
  _count: { materiaalCategorieen: number; extraOpties: number };
};

type Kolom = "naam" | "categorieen" | "opties";
type Sortering = { kolom: Kolom; richting: "asc" | "desc" };

// Zelfde behandeling als leads-table.tsx (audit T-01/T-02/T-03): zoeken,
// sorteren, sticky header, en een mobiele kaartweergave i.p.v. horizontaal
// scrollen. `products` komt server-side al volledig geladen binnen (per
// tool begrensd door de plan-limiet) — geen aparte server-roundtrip nodig
// voor zoeken/sorteren.
export function ProductenTable({ toolId, products, atLimit }: { toolId: string; products: ProductRow[]; atLimit: boolean }) {
  const [zoek, setZoek] = useState("");
  const [sortering, setSortering] = useState<Sortering>({ kolom: "naam", richting: "asc" });

  function wisselSortering(kolom: Kolom) {
    setSortering((prev) => (prev.kolom === kolom ? { kolom, richting: prev.richting === "asc" ? "desc" : "asc" } : { kolom, richting: "asc" }));
  }

  const zichtbaar = useMemo(() => {
    const query = zoek.trim().toLowerCase();
    const gefilterd = query ? products.filter((p) => p.naam.toLowerCase().includes(query)) : products;
    const factor = sortering.richting === "asc" ? 1 : -1;
    return [...gefilterd].sort((a, b) => {
      if (sortering.kolom === "naam") return factor * a.naam.localeCompare(b.naam);
      if (sortering.kolom === "categorieen") return factor * (a._count.materiaalCategorieen - b._count.materiaalCategorieen);
      return factor * (a._count.extraOpties - b._count.extraOpties);
    });
  }, [products, zoek, sortering]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek een product…"
          aria-label="Zoek in producten"
          className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <Card className="hidden overflow-hidden md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr className="border-b border-border text-left text-muted-foreground">
                <SorteerbareKolom label="Product" kolom="naam" sortering={sortering} onClick={wisselSortering} />
                <SorteerbareKolom label="Materiaalcategorieën" kolom="categorieen" sortering={sortering} onClick={wisselSortering} />
                <SorteerbareKolom label="Extra opties" kolom="opties" sortering={sortering} onClick={wisselSortering} />
                <th className="px-4 py-3 font-medium">Actief</th>
                <th className="px-4 py-3 text-right font-medium">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {zichtbaar.map((product) => (
                <ProductRij key={product.id} toolId={toolId} product={product} atLimit={atLimit} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-col gap-2 md:hidden">
        {zichtbaar.map((product) => {
          const ProductIcon = getProductIcon(product.icoon);
          return (
            <Card key={product.id}>
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2.5">
                  {ProductIcon && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ProductIcon className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{product.naam}</p>
                    <p className="text-xs text-muted-foreground">/ {unitLabel(product.eenheid)}</p>
                  </div>
                  <ActiveToggle action={toggleProductActiveAction} id={product.id} idField="productId" actief={product.actief} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="muted">{product._count.materiaalCategorieen} categorieën</Badge>
                    <Badge variant="muted">{product._count.extraOpties} opties</Badge>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <LinkButton href={`/dashboard/tools/${toolId}/producten/${product.id}/bewerken`} variant="ghost" size="icon" aria-label="Bewerken">
                      <Pencil className="h-4 w-4" />
                    </LinkButton>
                    <form action={copyProductAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <Button variant="ghost" size="icon" type="submit" aria-label="Kopiëren" disabled={atLimit}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </form>
                    <DeleteButton action={deleteProductAction} id={product.id} idField="productId" confirmMessage="Weet je zeker dat je dit product wilt verwijderen?" />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {zichtbaar.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          Geen producten gevonden voor &ldquo;{zoek}&rdquo;.
        </p>
      )}
    </div>
  );
}

function ProductRij({ toolId, product, atLimit }: { toolId: string; product: ProductRow; atLimit: boolean }) {
  const ProductIcon = getProductIcon(product.icoon);
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          {ProductIcon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {/* eslint-disable-next-line react-hooks/static-components -- stable lookup from a module-level icon map, not a new component */}
              <ProductIcon className="h-4 w-4" />
            </span>
          )}
          <div>
            <p className="font-medium text-foreground">{product.naam}</p>
            <p className="text-xs text-muted-foreground">/ {unitLabel(product.eenheid)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        <Badge variant="muted">{product._count.materiaalCategorieen}</Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        <Badge variant="muted">{product._count.extraOpties}</Badge>
      </td>
      <td className="px-4 py-3">
        <ActiveToggle action={toggleProductActiveAction} id={product.id} idField="productId" actief={product.actief} />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <LinkButton href={`/dashboard/tools/${toolId}/producten/${product.id}/bewerken`} variant="ghost" size="icon" aria-label="Bewerken">
            <Pencil className="h-4 w-4" />
          </LinkButton>
          <form action={copyProductAction}>
            <input type="hidden" name="productId" value={product.id} />
            <Button variant="ghost" size="icon" type="submit" aria-label="Kopiëren" disabled={atLimit}>
              <Copy className="h-4 w-4" />
            </Button>
          </form>
          <DeleteButton action={deleteProductAction} id={product.id} idField="productId" confirmMessage="Weet je zeker dat je dit product wilt verwijderen?" />
        </div>
      </td>
    </tr>
  );
}

function SorteerbareKolom({
  label,
  kolom,
  sortering,
  onClick,
}: {
  label: string;
  kolom: Kolom;
  sortering: Sortering;
  onClick: (kolom: Kolom) => void;
}) {
  const actief = sortering.kolom === kolom;
  const Icon = actief ? (sortering.richting === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="px-4 py-3 font-medium">
      <button type="button" onClick={() => onClick(kolom)} className={cn("flex items-center gap-1 transition-colors hover:text-foreground cursor-pointer", actief && "text-foreground")}>
        {label}
        <Icon className={cn("h-3.5 w-3.5", !actief && "opacity-40")} />
      </button>
    </th>
  );
}
