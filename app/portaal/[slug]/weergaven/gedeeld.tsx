"use client";

import { useEffect, useState } from "react";
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

// Staat het schermtoetsenbord open? Dan krimpt het zichtbare deel van het scherm (visualViewport) flink.
export function useToetsenbordOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const zet = () => setOpen(window.innerHeight - vv.height > 150);
    zet();
    vv.addEventListener("resize", zet);
    return () => vv.removeEventListener("resize", zet);
  }, []);
  return open;
}

// Ronde knop met een vinkje, rechtsonder in de sheet van een onderdeel (alleen op een telefoon). Staat buiten het scrollende deel,
// dus altijd in beeld; verdwijnt zolang het toetsenbord open staat (dan zou hij de invoervelden afdekken).
export function ToevoegFab({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  const toetsenbord = useToetsenbordOpen();
  if (toetsenbord) return null;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "absolute right-4 z-10 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full shadow-lg ring-1 ring-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "motion-safe:transition-transform motion-safe:duration-100 enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        MERKKNOP
      )}
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <Check className="h-7 w-7" strokeWidth={3} aria-hidden="true" />
    </button>
  );
}
