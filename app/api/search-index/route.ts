import { NextResponse } from "next/server";
import { DOELGROEPEN } from "@/app/lib/doelgroepen";
import { alleContent } from "@/app/lib/content";

export const revalidate = 3600;

export type ZoekResultaat = { id: string; title: string; description: string; href: string; type: string };

// Databron voor de contentzoekfunctie (Fase 9) — één JSON-endpoint dat de
// client eenmalig ophaalt en vervolgens lokaal doorzoekt (minisearch), zodat
// resultaten instant verschijnen zonder bij elke toetsaanslag een
// serveraanvraag te doen. Wordt automatisch compleet zodra er een nieuw
// .mdx-bestand of een nieuwe doelgroep wordt toegevoegd.
export async function GET() {
  const items: ZoekResultaat[] = [
    ...DOELGROEPEN.map((d) => ({
      id: `voor-${d.slug}`,
      title: d.title,
      description: d.description,
      href: `/voor/${d.slug}`,
      type: "Voor vakmensen",
    })),
    ...alleContent("kennisbank").map((item) => ({
      id: `kennisbank-${item.slug}`,
      title: item.frontmatter.title,
      description: item.frontmatter.description,
      href: `/kennisbank/${item.slug}`,
      type: "Kennisbank",
    })),
    ...alleContent("features").map((item) => ({
      id: `features-${item.slug}`,
      title: item.frontmatter.title,
      description: item.frontmatter.description,
      href: `/features/${item.slug}`,
      type: "Functionaliteiten",
    })),
    ...alleContent("blog").map((item) => ({
      id: `blog-${item.slug}`,
      title: item.frontmatter.title,
      description: item.frontmatter.description,
      href: `/blog/${item.slug}`,
      type: "Blog",
    })),
  ];

  return NextResponse.json(items);
}
