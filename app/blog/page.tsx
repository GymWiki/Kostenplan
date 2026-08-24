import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { Reveal } from "@/app/components/ui/reveal";
import { Card, CardContent } from "@/app/components/ui/card";
import { SiteHeader } from "@/app/components/marketing/site-header";
import { SiteFooter } from "@/app/components/marketing/site-footer";
import { Breadcrumbs } from "@/app/components/marketing/breadcrumbs";
import { alleContent } from "@/app/lib/content";

const TITLE = "Blog";
const DESCRIPTION =
  "Verhalen, inzichten en updates over rekentools, offertes en het werk van vakmensen.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `${TITLE} · Kostenplan`,
    description: DESCRIPTION,
    url: "/blog",
    siteName: "Kostenplan",
    locale: "nl_NL",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · Kostenplan`,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

const datumFormatter = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });

export default function BlogPage() {
  const posts = alleContent("blog");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <Breadcrumbs items={[{ label: "Blog", href: "/blog" }]} />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
              Blog
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{DESCRIPTION}</p>
          </Reveal>

          {posts.length === 0 ? (
            <Reveal delay={100}>
              <Card className="mt-12">
                <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <Newspaper className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Binnenkort de eerste artikelen</p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Nieuwe blogposts komen automatisch hier te staan zodra ze gepubliceerd worden.
                      Ondertussen vind je praktische uitleg al in de{" "}
                      <Link href="/kennisbank" className="font-medium text-primary hover:underline">
                        kennisbank
                      </Link>
                      .
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ) : (
            <div className="mt-12 flex flex-col gap-4">
              {posts.map((post, i) => (
                <Reveal key={post.slug} delay={i * 60}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {datumFormatter.format(new Date(post.frontmatter.publishedAt))}
                      </p>
                      <h2 className="mt-0.5 font-semibold text-foreground">{post.frontmatter.title}</h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {post.frontmatter.description}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary">
                      Lezen
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
