import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/app/lib/cn";

export type Kruimel = { label: string; href?: string };

// Duidelijke hiërarchie door de bouwer heen (Deel 11 van de UI/UX-
// herontwerpopdracht: "Mijn rekentools → Complete tuin → Onderdelen →
// Bestrating → Vragen"), zodat een gebruiker nooit hoeft te gokken waar hij
// is. Het laatste item is nooit een link (dat is de huidige pagina).
export function Breadcrumbs({ items, className }: { items: Kruimel[]; className?: string }) {
  return (
    <nav aria-label="Broodkruimel" className={cn("flex flex-wrap items-center gap-1.5 text-sm", className)}>
      {items.map((item, i) => {
        const laatste = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />}
            {item.href && !laatste ? (
              <Link href={item.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={laatste ? "page" : undefined}
                className={laatste ? "font-medium text-foreground" : "text-muted-foreground"}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
