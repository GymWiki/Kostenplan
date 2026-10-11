import Link from "next/link";
import { Logo } from "@/app/components/ui/logo";
import { CtaLink } from "@/app/components/landing/cta-link";

const LINKS = [
  { href: "#zo-werkt-het", label: "Zo werkt het" },
  { href: "#werkzaamheden", label: "Werkzaamheden" },
  { href: "#prijzen", label: "Prijzen" },
  { href: "#vragen", label: "Vragen" },
];

export function LpHeader() {
  return (
    <header className="border-b-[1.5px] border-lp-inkt bg-lp-papier">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 font-lp-display text-xl font-extrabold [font-stretch:112%]">
          <Logo />
          Kostenplan
        </Link>
        <nav aria-label="Op deze pagina" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="px-3 py-2 text-sm font-semibold text-lp-inkt-2 hover:text-lp-inkt">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden min-h-11 items-center px-3 text-sm font-semibold hover:underline sm:inline-flex">
            Inloggen
          </Link>
          <CtaLink href="/probeer" bron="nav" className="min-h-11 px-4 text-sm">
            Probeer gratis
          </CtaLink>
        </div>
      </div>
    </header>
  );
}
