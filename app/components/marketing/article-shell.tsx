import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Breadcrumbs } from "@/app/components/marketing/breadcrumbs";
import type { KennisbankArtikel } from "@/app/lib/kennisbank";

// Gedeelde chrome voor kennisbank-artikelen: breadcrumbs, Article-JSON-LD en
// een consistente typografische stijl voor de artikeltekst — zonder een
// typography-plugin (die ontbreekt in dit project) via Tailwind's
// arbitrary-variant kindselectors, zodat elk artikel gewoon platte
// semantische HTML (h2/p/ul/ol/strong) als children kan doorgeven.
export function ArticleShell({
  artikel,
  children,
}: {
  artikel: KennisbankArtikel;
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: artikel.titel,
    description: artikel.samenvatting,
    datePublished: artikel.datum,
    dateModified: artikel.datum,
    author: { "@type": "Organization", name: "Kostenplan" },
    publisher: { "@type": "Organization", name: "Kostenplan" },
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <Breadcrumbs
        items={[
          { label: "Kennisbank", href: "/kennisbank" },
          { label: artikel.titel, href: `/kennisbank/${artikel.slug}` },
        ]}
      />

      <main className="flex-1">
        <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            {artikel.titel}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{artikel.samenvatting}</p>

          <div
            className="mt-10 flex flex-col gap-5 text-foreground
              [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2:first-child]:mt-0
              [&_p]:leading-relaxed [&_p]:text-muted-foreground
              [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_ul]:text-muted-foreground
              [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5 [&_ol]:text-muted-foreground
              [&_li]:leading-relaxed
              [&_strong]:font-semibold [&_strong]:text-foreground
              [&_a]:font-medium [&_a]:text-primary [&_a]:hover:underline"
          >
            {children}
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
