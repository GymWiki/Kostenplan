import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alleContent, alleSlugs, leesContent } from "@/app/lib/content";
import { ContentShell } from "@/app/components/marketing/content-shell";
import { RelatedContent } from "@/app/components/marketing/related-content";

export function generateStaticParams() {
  return alleSlugs("kennisbank").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = leesContent("kennisbank", slug);
  if (!item) return {};
  const canonical = `/kennisbank/${slug}`;
  return {
    title: item.frontmatter.title,
    description: item.frontmatter.description,
    keywords: item.frontmatter.keywords,
    alternates: { canonical },
    openGraph: {
      title: `${item.frontmatter.title} · Kostenplan`,
      description: item.frontmatter.description,
      url: canonical,
      siteName: "Kostenplan",
      locale: "nl_NL",
      type: "article",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${item.frontmatter.title} · Kostenplan`,
      description: item.frontmatter.description,
      images: ["/opengraph-image"],
    },
  };
}

// Eén dynamische route bedient alle kennisbank-artikelen (Fase 3 van de
// SEO/GEO-opdracht) — nieuwe content toevoegen is een nieuw .mdx-bestand in
// content/kennisbank/, geen nieuwe pagina.
export default async function KennisbankArtikelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = leesContent("kennisbank", slug);
  if (!item) notFound();

  const features = alleContent("features");

  return (
    <ContentShell
      item={item}
      gerelateerd={
        <RelatedContent
          titel="Gerelateerde functionaliteiten"
          links={features.map((f) => ({
            title: f.frontmatter.title,
            href: `/features/${f.slug}`,
            description: f.frontmatter.description,
          }))}
        />
      }
    />
  );
}
