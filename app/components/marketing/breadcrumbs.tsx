import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getSiteUrl } from "@/app/lib/url";

export type BreadcrumbItem = { label: string; href: string };

// Zichtbare broodkruimelnavigatie + bijbehorende BreadcrumbList JSON-LD
// (schema.org) — samen in één component zodat de twee nooit uit sync raken.
// `items` bevat GEEN "Home": die wordt hier altijd als eerste stap
// toegevoegd, zodat elke aanroeper alleen de pagina-specifieke stappen
// hoeft op te geven.
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const alleItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, ...items];
  const siteUrl = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: alleItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: `${siteUrl}${item.href}`,
    })),
  };

  return (
    <nav aria-label="Broodkruimel" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {alleItems.map((item, i) => {
          const laatste = i === alleItems.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
                  aria-hidden="true"
                />
              )}
              {laatste ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="transition-colors hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
