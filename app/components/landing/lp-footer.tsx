import Link from "next/link";
import { BEDRIJF, DEFINITIE } from "@/app/lib/landing/feiten";

const KOLOMMEN: { titel: string; links: { href: string; label: string }[] }[] = [
  {
    titel: "Product",
    links: [
      { href: "/probeer", label: "Probeer gratis" },
      { href: "/rekentool", label: "Wat is een rekentool?" },
      { href: "/voorbeelden-rekentools", label: "Voorbeelden" },
      { href: "/features", label: "Functionaliteiten" },
      { href: "/prijzen", label: "Prijzen" },
      { href: "/kennisbank", label: "Kennisbank" },
      { href: "/login", label: "Inloggen" },
    ],
  },
  {
    titel: "Voor hoveniers",
    links: [
      { href: "/voor/hoveniers", label: "Rekentool voor hoveniers" },
      { href: "/offerte-calculator", label: "Offerte calculator" },
      { href: "/prijs-calculator", label: "Prijs calculator" },
      { href: "/online-offerte-maken", label: "Online offerte maken" },
      { href: "/rekentool-op-eigen-website", label: "Op je eigen website" },
    ],
  },
  {
    titel: "Juridisch",
    links: [
      { href: "/privacybeleid", label: "Privacyverklaring" },
      { href: "/algemene-voorwaarden", label: "Algemene voorwaarden" },
      { href: `mailto:${BEDRIJF.email}`, label: "Contact" },
    ],
  },
];

export function LpFooter() {
  return (
    <footer className="border-t border-lp-lijn bg-lp-wit text-lp-inkt">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <p className="font-lp-display text-2xl font-semibold">Kostenplan</p>
            <p className="mt-3 max-w-md text-base text-lp-inkt-2">{DEFINITIE}</p>
            <p className="mt-5 text-sm text-lp-inkt-2">
              Kostenplan is onderdeel van {BEDRIJF.naam} · KVK {BEDRIJF.kvk} · BTW {BEDRIJF.btw} · {BEDRIJF.plaats}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {KOLOMMEN.map((k) => (
              <nav key={k.titel} aria-label={k.titel}>
                <p className="font-lp-maat text-[11px] tracking-wide text-lp-oker-donker">{k.titel}</p>
                <ul className="mt-3 flex flex-col gap-1">
                  {k.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="inline-flex min-h-9 items-center text-sm text-lp-inkt hover:underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <p className="mt-12 border-t border-lp-lijn pt-6 text-sm text-lp-inkt-2">© {new Date().getFullYear()} Kostenplan</p>
      </div>
    </footer>
  );
}
