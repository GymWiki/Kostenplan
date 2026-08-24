import { MDXRemote } from "next-mdx-remote/rsc";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Breadcrumbs, type BreadcrumbItem } from "@/app/components/marketing/breadcrumbs";
import { GeoAnswer } from "@/app/components/marketing/geo-answer";
import { FaqSection } from "@/app/components/marketing/faq-section";
import { mdxComponents } from "@/app/components/marketing/mdx-components";
import { getSiteUrl } from "@/app/lib/url";
import type { ContentItem } from "@/app/lib/content";

const COLLECTIE_PAD: Record<ContentItem["collectie"], string> = {
  blog: "/blog",
  kennisbank: "/kennisbank",
  features: "/features",
};

// Gedeelde renderer voor elk .mdx-content-item (Fase 4/5/6 van de SEO/GEO-
// opdracht): breadcrumbs, een direct-citeerbare definitie/samenvatting
// bovenaan (GEO), de MDX-body met consistente typografie, een FAQ-sectie
// (met FAQPage-JSON-LD) uit de frontmatter, en automatisch gegenereerde
// JSON-LD — Article+FAQPage+BreadcrumbList voor blog/kennisbank,
// SoftwareApplication+FAQPage+BreadcrumbList voor features (Fase 6).
// Nieuwe content krijgt dit alles gratis door simpelweg een .mdx-bestand
// met de juiste frontmatter toe te voegen — er is geen aparte code per
// pagina nodig.
export async function ContentShell({
  item,
  extraKruimels = [],
  gerelateerd,
}: {
  item: ContentItem;
  extraKruimels?: BreadcrumbItem[];
  gerelateerd?: React.ReactNode;
}) {
  const { frontmatter, body, collectie, slug } = item;
  const pad = `${COLLECTIE_PAD[collectie]}/${slug}`;
  const siteUrl = getSiteUrl();

  const collectieLabel = collectie === "blog" ? "Blog" : collectie === "kennisbank" ? "Kennisbank" : "Functionaliteiten";
  const kruimels: BreadcrumbItem[] = [
    { label: collectieLabel, href: COLLECTIE_PAD[collectie] },
    ...extraKruimels,
    { label: frontmatter.title, href: pad },
  ];

  // BreadcrumbList-JSON-LD wordt al door <Breadcrumbs> zelf gerenderd —
  // hier alleen het hoofdtype (Article/SoftwareApplication) + FAQPage, om
  // geen dubbele BreadcrumbList-blokken op dezelfde pagina te krijgen.
  const faqJsonLd =
    frontmatter.faq && frontmatter.faq.length > 0
      ? {
          "@type": "FAQPage",
          mainEntity: frontmatter.faq.map((faq) => ({
            "@type": "Question",
            name: faq.vraag,
            acceptedAnswer: { "@type": "Answer", text: faq.antwoord },
          })),
        }
      : null;

  const hoofdJsonLd =
    collectie === "features"
      ? {
          "@type": "SoftwareApplication",
          name: frontmatter.title,
          description: frontmatter.description,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: `${siteUrl}${pad}`,
        }
      : {
          "@type": "Article",
          headline: frontmatter.title,
          description: frontmatter.description,
          datePublished: frontmatter.publishedAt,
          dateModified: frontmatter.updatedAt ?? frontmatter.publishedAt,
          author: { "@type": "Organization", name: "Kostenplan" },
          publisher: { "@type": "Organization", name: "Kostenplan" },
          url: `${siteUrl}${pad}`,
        };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [hoofdJsonLd, ...(faqJsonLd ? [faqJsonLd] : [])],
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      <Breadcrumbs items={kruimels} />

      <main id="main-content" className="flex-1">
        <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            {frontmatter.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{frontmatter.description}</p>

          {frontmatter.definitie && (
            <div className="mt-6">
              <GeoAnswer>{frontmatter.definitie}</GeoAnswer>
            </div>
          )}

          <div className="mt-10 flex flex-col gap-5">
            <MDXRemote source={body} components={mdxComponents} />
          </div>
        </article>

        {frontmatter.faq && frontmatter.faq.length > 0 && (
          <FaqSection
            faqs={frontmatter.faq}
            id="content-faq"
            titel="Veelgestelde vragen"
            intro={`Concrete antwoorden over ${frontmatter.title.toLowerCase()}.`}
          />
        )}

        {gerelateerd && <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">{gerelateerd}</section>}
      </main>

      <SiteFooter />
    </div>
  );
}
