import Link from "next/link";
import { LinkButton } from "@/app/components/ui/button";
import { Logo } from "@/app/components/ui/logo";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { SearchDialog } from "@/app/components/marketing/search-dialog";
import { MobileNav } from "@/app/components/marketing/mobile-nav";
import { NAV_LINKS } from "@/app/components/marketing/nav-links";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-semibold text-foreground">
          <Logo />
          Kostenplan
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hidden px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground ${link.breakpoint}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <SearchDialog />
          <ThemeToggle />
          <LinkButton href="/login" variant="ghost" className="hidden sm:inline-flex">
            Inloggen
          </LinkButton>
          <LinkButton href="/registreren">Start nu gratis</LinkButton>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
