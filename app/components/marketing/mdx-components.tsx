import Link from "next/link";
import type { MDXComponents } from "mdx/types";

// Gedeelde stijl voor elk gerenderd .mdx-bestand (blog/kennisbank/features)
// — houdt de typografie consistent met de rest van de marketingsite zonder
// een typography-plugin (die ontbreekt in dit project), door gewoon elk
// markdown-element op een eigen, gestylede React-component te mappen i.p.v.
// CSS-descendant-selectors te gebruiken.
export const mdxComponents: MDXComponents = {
  h2: ({ children }) => (
    <h2 className="mt-8 text-xl font-semibold text-foreground first:mt-0 sm:text-2xl">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mt-6 text-lg font-semibold text-foreground">{children}</h3>,
  p: ({ children }) => <p className="leading-relaxed text-muted-foreground">{children}</p>,
  ul: ({ children }) => (
    <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="flex list-decimal flex-col gap-2 pl-5 leading-relaxed text-muted-foreground">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ href, children }) =>
    href?.startsWith("/") ? (
      <Link href={href} className="font-medium text-primary hover:underline">
        {children}
      </Link>
    ) : (
      <a href={href} className="font-medium text-primary hover:underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/30 pl-4 text-muted-foreground italic">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[480px] border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-border bg-secondary/40">{children}</thead>,
  th: ({ children }) => <th className="px-4 py-2.5 text-left font-semibold text-foreground">{children}</th>,
  td: ({ children }) => <td className="border-t border-border px-4 py-2.5 text-muted-foreground">{children}</td>,
  hr: () => <hr className="border-border" />,
};
