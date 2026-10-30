import Link from "next/link";
import { VRAGEN, LAATST_BIJGEWERKT } from "@/app/lib/landing/feiten";
import { Positie } from "@/app/components/landing/maat";
import { VragenLijst } from "@/app/components/landing/vragen-lijst";

const MEER: Record<number, { href: string; label: string }> = {
  0: { href: "/online-offerte-maken", label: "Online offerte maken" },
  1: { href: "/features/prijsindicatie-tool", label: "De prijsindicatie-tool" },
  2: { href: "/rekentool-op-eigen-website", label: "Rekentool op je eigen website" },
  4: { href: "/prijzen", label: "Alle prijzen" },
  5: { href: "/kennisbank/hoe-werkt-een-offerte-calculator", label: "Hoe werkt een offerte-calculator?" },
};

// Sectie 6: de vragen als uitklapbare rijen (zie vragen-lijst.tsx). De antwoorden staan altijd in de pagina en in het JSON-LD (landing-schema.tsx).
export function SectieVragen() {
  return (
    <section id="vragen" aria-labelledby="h-vragen" className="px-3 py-2 sm:px-6">
      <div className="mx-auto rounded-[2rem] sm:rounded-[2.5rem] bg-lp-papier-2 max-w-7xl px-5 pb-20 pt-16 sm:px-12 sm:pb-28 sm:pt-24">
        <Positie nr="06" label="Veelgestelde vragen" />
        <h2 id="h-vragen" className="mt-4 text-4xl font-semibold leading-[1.02] sm:text-5xl">
          Vragen van hoveniers
        </h2>
        <p className="mt-3 text-base text-lp-inkt-2">
          Laatst bijgewerkt: <time dateTime={LAATST_BIJGEWERKT.iso}>{LAATST_BIJGEWERKT.tekst}</time>
        </p>
        <VragenLijst
          vragen={VRAGEN.map((v, i) => ({
            ...v,
            meer: MEER[i] && (
              <Link href={MEER[i].href} className="font-semibold underline decoration-lp-bos-700 decoration-2 underline-offset-4">
                {MEER[i].label}
              </Link>
            ),
          }))}
        />
      </div>
    </section>
  );
}
