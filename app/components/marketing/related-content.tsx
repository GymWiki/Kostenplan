import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Gedeeld "gerelateerde content"-blok (Fase 7 van de SEO/GEO-opdracht:
// features ↔ kennisbank ↔ doelgroepen moeten naar elkaar linken i.p.v. los
// van elkaar te staan) — gebruikt onderaan elke content-pagina.
export type RelatedLink = { title: string; href: string; description: string };

export function RelatedContent({ titel, links }: { titel: string; links: RelatedLink[] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">{titel}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex flex-col gap-1.5 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <span className="font-semibold text-foreground">{link.title}</span>
            <span className="text-sm text-muted-foreground">{link.description}</span>
            <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary">
              Lezen
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
