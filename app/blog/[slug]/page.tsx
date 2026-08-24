import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alleContent, alleSlugs, leesContent } from "@/app/lib/content";
import { ContentShell } from "@/app/components/marketing/content-shell";
import { RelatedContent } from "@/app/components/marketing/related-content";

export function generateStaticParams() {
  return alleSlugs("blog").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = leesContent("blog", slug);
  if (!item) return {};
  const canonical = `/blog/${slug}`;
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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = leesContent("blog", slug);
  if (!item) notFound();

  const kennisbank = alleContent("kennisbank").slice(0, 2);
  const features = alleContent("features").slice(0, 2);

  return (
    <ContentShell
      item={item}
      gerelateerd={
        <RelatedContent
          titel="Meer lezen"
          links={[
            ...kennisbank.map((k) => ({
              title: k.frontmatter.title,
              href: `/kennisbank/${k.slug}`,
              description: k.frontmatter.description,
            })),
            ...features.map((f) => ({
              title: f.frontmatter.title,
              href: `/features/${f.slug}`,
              description: f.frontmatter.description,
            })),
          ]}
        />
      }
    />
  );
}
