import Link from "next/link";
import { LinkButton } from "@/app/components/ui/button";
import { Logo } from "@/app/components/ui/logo";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Logo />
          Kostenplan
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/prijzen"
            className="hidden px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Prijzen
          </Link>
          <ThemeToggle />
          <LinkButton href="/login" variant="ghost" className="hidden sm:inline-flex">
            Inloggen
          </LinkButton>
          <LinkButton href="/registreren">Start nu gratis</LinkButton>
        </nav>
      </div>
    </header>
  );
}
