import { Lock } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { LinkButton } from "@/app/components/ui/button";
import { cn } from "@/app/lib/cn";

// Eén "dit mag je nog niet"-kaart voor Plus/Pro-only features — voorheen
// drie keer bijna-identiek met de hand nagebouwd (Leads, Insluiten,
// SharePortalCard's insluit-tab). `size="lg"` is de grotere, gecentreerde
// vorm voor een hele lege pagina (Leads); `size="sm"` de compacte,
// linksuitgelijnde vorm die in een bestaande sectie past (Insluiten,
// SharePortalCard). `wrapper` bepaalt of het component zijn eigen Card/
// dashed-border-kader meebrengt, of dat de aanroeper dat al regelt.
export function ProFeatureLock({
  title,
  description,
  ctaLabel = "Upgrade naar Pro",
  ctaHref = "/dashboard/abonnement",
  size = "sm",
  wrapper = "card",
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  size?: "sm" | "lg";
  wrapper?: "card" | "inline" | "none";
}) {
  const content = (
    <div className={cn("flex flex-col gap-3", size === "lg" ? "items-center text-center" : "items-start")}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center bg-primary/10 text-primary",
          size === "lg" ? "h-12 w-12 rounded-full" : "h-9 w-9 rounded-lg"
        )}
      >
        <Lock className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} />
      </span>
      <div>
        <p
          className={cn(
            "text-foreground",
            size === "lg" ? "text-lg font-semibold" : "text-sm font-medium"
          )}
        >
          {title}
        </p>
        <p className={cn("mt-1 text-muted-foreground", size === "lg" ? "max-w-sm text-sm" : "text-sm")}>
          {description}
        </p>
      </div>
      <LinkButton href={ctaHref} size={size === "lg" ? "md" : "sm"} className={size === "lg" ? "mt-2" : undefined}>
        {ctaLabel}
      </LinkButton>
    </div>
  );

  if (wrapper === "card") {
    return (
      <Card>
        <CardContent className={size === "lg" ? "py-16" : undefined}>{content}</CardContent>
      </Card>
    );
  }
  if (wrapper === "inline") {
    return <div className="rounded-lg border border-dashed border-border p-4">{content}</div>;
  }
  return content;
}
