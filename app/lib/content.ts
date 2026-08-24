import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// Schaalbare, bestandsgedreven contentlaag (SEO/GEO-opdracht Fase 3):
// nieuwe content toevoegen = een nieuw .mdx-bestand neerzetten in
// content/{collectie}/, geen codewijziging nodig. Elk bestand krijgt zijn
// slug van de bestandsnaam en een gestructureerde frontmatter (title/
// description/keywords/faq/publishedAt) die zowel de metadata, de
// FAQPage/Article-JSON-LD als de sitemap automatisch voedt — zie
// app/blog/[slug]/page.tsx, app/kennisbank/[slug]/page.tsx,
// app/features/[slug]/page.tsx en app/sitemap.ts.
export type ContentCollectie = "blog" | "kennisbank" | "features";

export type ContentFaqItem = { vraag: string; antwoord: string };

export type ContentFrontmatter = {
  title: string;
  description: string;
  keywords?: string[];
  faq?: ContentFaqItem[];
  publishedAt: string;
  updatedAt?: string;
  // GEO (Fase 5): een korte, op zichzelf staande definitie en samenvatting
  // bovenaan de pagina — bewust apart van de MDX-body zodat AI-systemen
  // (en de FAQPage/Article-JSON-LD) er direct, zonder parsing, een
  // citeerbaar antwoord uit kunnen halen.
  definitie?: string;
  samenvatting?: string;
};

export type ContentItem = {
  slug: string;
  collectie: ContentCollectie;
  frontmatter: ContentFrontmatter;
  body: string;
};

const CONTENT_ROOT = path.join(process.cwd(), "content");

function collectiePad(collectie: ContentCollectie): string {
  return path.join(CONTENT_ROOT, collectie);
}

export function alleSlugs(collectie: ContentCollectie): string[] {
  const dir = collectiePad(collectie);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((bestand) => bestand.endsWith(".mdx"))
    .map((bestand) => bestand.replace(/\.mdx$/, ""));
}

export function leesContent(collectie: ContentCollectie, slug: string): ContentItem | null {
  const bestand = path.join(collectiePad(collectie), `${slug}.mdx`);
  if (!fs.existsSync(bestand)) return null;
  const raw = fs.readFileSync(bestand, "utf-8");
  const { data, content } = matter(raw);
  return { slug, collectie, frontmatter: data as ContentFrontmatter, body: content };
}

export function alleContent(collectie: ContentCollectie): ContentItem[] {
  return alleSlugs(collectie)
    .map((slug) => leesContent(collectie, slug))
    .filter((item): item is ContentItem => item != null)
    .sort((a, b) => (a.frontmatter.publishedAt < b.frontmatter.publishedAt ? 1 : -1));
}

export function alleContentCollecties(): ContentItem[] {
  return [...alleContent("blog"), ...alleContent("kennisbank"), ...alleContent("features")];
}
