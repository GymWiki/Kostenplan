import Link from "next/link";
import { Logo } from "@/app/components/ui/logo";
import { CtaLink } from "@/app/components/landing/cta-link";
import { LpMenu, type MenuLink } from "@/app/components/landing/lp-menu";
import { SearchDialog } from "@/app/components/marketing/search-dialog";

// Op de landing: links naar onderdelen van de pagina. Op alle andere pagina's:
// de hoofdnavigatie van de site, met zoeken.
const PAGINA_LINKS: MenuLink[] = [
  { href: "/#zo-werkt-het", label: "Zo werkt het" },
  { href: "/#werkzaamheden", label: "Werkzaamheden" },
  { href: "/#prijzen", label: "Prijzen" },
  { href: "/#vragen", label: "Vragen" },
];
const SITE_LINKS: MenuLink[] = [
  { href: "/features", label: "Functionaliteiten" },
  { href: "/voor/hoveniers", label: "Voor hoveniers" },
  { href: "/kennisbank", label: "Kennisbank" },
  { href: "/blog", label: "Blog" },
  { href: "/prijzen", label: "Prijzen" },
];

export function LpHeader({ variant = "pagina" }: { variant?: "pagina" | "site" }) {
  const links = variant === "site" ? SITE_LINKS : PAGINA_LINKS;
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div className="relative mx-auto max-w-7xl">
        <div className="lp-glas lp-zacht flex items-center justify-between gap-3 rounded-full border border-lp-lijn py-2 pl-3 pr-1.5 sm:pl-5 sm:pr-2">
          <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-[-0.03em] sm:gap-2.5">
            <Logo className="rounded-xl" />
            Kostenplan
          </Link>
          <nav aria-label={variant === "site" ? "Hoofdnavigatie" : "Op deze pagina"} className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-sm font-medium text-lp-inkt-2 transition-colors hover:bg-lp-papier-2 hover:text-lp-inkt">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-0.5 sm:gap-2">
            {variant === "site" && (
              <div className="hidden sm:block">
                <SearchDialog />
              </div>
            )}
            <Link href="/login" className="hidden min-h-11 items-center rounded-full px-3 text-sm font-semibold hover:bg-lp-papier-2 sm:inline-flex">
              Inloggen
            </Link>
            <CtaLink href="/probeer" bron="nav" className="min-h-11 whitespace-nowrap px-3 text-sm sm:px-4">
              Probeer gratis
            </CtaLink>
            <LpMenu links={links} />
          </div>
        </div>
      </div>
    </header>
  );
}
