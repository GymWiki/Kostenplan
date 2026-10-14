"use client";

import { Check } from "lucide-react";
import { getProductIcon } from "@/app/lib/icons";
import { cn } from "@/app/lib/cn";
import { formatCenten } from "@/app/lib/pricing/format";
import { meervoud } from "@/app/lib/meervoud";
import type { ProductWithDetails } from "../calculator";
import type { ZichtbaarGebied } from "./host-viewport";

export const MERKKNOP = "border-transparent bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] hover:opacity-90";

export type Configurator = (product: ProductWithDetails, opties: { prijsVerborgen: boolean }) => React.ReactNode;

export function OnderdeelIcoon({ product, className }: { product: Pick<ProductWithDetails, "icoon">; className?: string }) {
  const Icoon = getProductIcon(product.icoon);
  if (!Icoon) return null;
  // eslint-disable-next-line react-hooks/static-components -- vaste opzoeking in een module-level iconenlijst, geen nieuwe component
  return <Icoon className={className ?? "h-6 w-6"} aria-hidden="true" />;
}

export function Vinkje({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]", className)}>
      <Check className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}

// "2 onderdelen · € 4.350" voor de onderbalk; zonder bedrag als de prijs pas na de contactgegevens getoond wordt.
export function planSamenvatting(aantal: number, totaalCenten: number | null): string {
  return totaalCenten === null ? meervoud(aantal, "onderdeel", "onderdelen") : `${meervoud(aantal, "onderdeel", "onderdelen")} · ${formatCenten(totaalCenten)}`;
}

// Vaste balk onderaan het scherm. In een iframe op de site van de hovenier is "onderaan" het onderste deel van wat de bezoeker
// ziet (zie host-viewport.ts); anders gewoon vast onderin het venster.
export function VasteBalk({ zichtbaar, className, children, label }: { zichtbaar: ZichtbaarGebied | null; className?: string; children: React.ReactNode; label: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(zichtbaar ? "absolute inset-x-0 z-30 -translate-y-full" : "fixed inset-x-0 bottom-0 z-30", "print:hidden", className)}
      style={zichtbaar ? { top: zichtbaar.top + zichtbaar.height } : undefined}
    >
      {children}
    </div>
  );
}
