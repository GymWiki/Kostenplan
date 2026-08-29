import { Check } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { cn } from "@/app/lib/cn";

export type MockupVeld = { label: string; waarde: string };

// Herbruikbare "website met een Kostenplan-rekentool erop"-mockup (SEO/GEO-
// herpositionering, Deel 3-8): de buitenste laag (browserbalk + bedrijfsnaam)
// mag fictief zijn, maar de rekentool zelf hergebruikt uitsluitend bestaande
// Kostenplan-componenten (Card/CardContent, dezelfde rij- en knopstijl als
// de al langer bestaande CalculatorMockup in app/page.tsx) — een bezoeker
// moet denken "dit is precies wat ik krijg", niet "los ontwerp dat op
// Kostenplan lijkt". `compact` verkleint de mockup voor gebruik naast andere
// mockups (bijv. de "Eén platform"-showcase) zonder de structuur te wijzigen.
export function WebsiteCalculatorMockup({
  siteUrl,
  bedrijfsnaam,
  productTitel,
  velden,
  resultaatLabel = "Indicatieprijs",
  resultaatWaarde,
  cta,
  rotate = "",
  compact = false,
  className,
}: {
  siteUrl: string;
  bedrijfsnaam: string;
  productTitel: string;
  velden: MockupVeld[];
  resultaatLabel?: string;
  resultaatWaarde: string;
  cta: string;
  rotate?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative mx-auto w-full", compact ? "max-w-xs" : "max-w-sm", className)} aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/10 blur-2xl" />
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card shadow-xl transition-transform duration-500 hover:rotate-0",
          rotate
        )}
      >
        {/* Fictieve browserbalk — toont het (verzonnen) domein van de vakman */}
        <div className="flex items-center gap-1.5 border-b border-border bg-secondary/60 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
          <span className="ml-2 truncate text-xs font-medium text-muted-foreground">{siteUrl}</span>
        </div>

        {/* Fictieve website-omgeving rondom de rekentool */}
        <div className={cn("bg-secondary/20", compact ? "p-3" : "p-4")}>
          <p className={cn("truncate font-bold text-foreground", compact ? "text-xs" : "text-sm")}>{bedrijfsnaam}</p>

          {/* De rekentool zelf: dezelfde Card/CardContent-opbouw als de
              rest van het product — dit is het herkenbare Kostenplan-deel. */}
          <Card className={cn("mt-3 border-primary/15", compact ? "shadow-none" : "shadow-md")}>
            <CardContent className={cn("flex flex-col", compact ? "gap-2.5 p-3" : "gap-4")}>
              <p className={cn("font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>{productTitel}</p>

              <ul className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
                {(compact ? velden.slice(0, 3) : velden).map((veld) => (
                  <li key={veld.label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                      <span className="truncate">{veld.label}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">{veld.waarde}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>{resultaatLabel}</span>
                <span className={cn("font-bold text-primary", compact ? "text-sm" : "text-lg")}>{resultaatWaarde}</span>
              </div>

              <span
                className={cn(
                  "flex w-full items-center justify-center rounded-md bg-primary font-medium text-primary-foreground",
                  compact ? "py-1.5 text-xs" : "py-2.5 text-sm"
                )}
              >
                {cta}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
