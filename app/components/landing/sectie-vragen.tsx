import Link from "next/link";
import { VRAGEN, LAATST_BIJGEWERKT } from "@/app/lib/landing/feiten";
import { Positie } from "@/app/components/landing/maat";

const MEER: Record<number, { href: string; label: string }> = {
  0: { href: "/online-offerte-maken", label: "Online offerte maken" },
  1: { href: "/features/prijsindicatie-tool", label: "De prijsindicatie-tool" },
  2: { href: "/rekentool-op-eigen-website", label: "Rekentool op je eigen website" },
  4: { href: "/prijzen", label: "Alle prijzen" },
  5: { href: "/kennisbank/hoe-werkt-een-offerte-calculator", label: "Hoe werkt een offerte-calculator?" },
};

// Sectie 10: vragen links, antwoord rechts, alles zichtbaar (geen uitklappers),
// zodat zoekmachines en AI-antwoorden de tekst letterlijk kunnen overnemen.
export function SectieVragen() {
  return (
    <section id="vragen" aria-labelledby="h-vragen" className="px-3 py-2 sm:px-6">
      <div className="mx-auto rounded-[2rem] sm:rounded-[2.5rem] bg-lp-papier-2 max-w-7xl px-5 pb-20 pt-16 sm:px-12 sm:pb-28 sm:pt-24">
        <Positie nr="10" label="Veelgestelde vragen" />
        <h2 id="h-vragen" className="mt-4 text-4xl font-semibold leading-[1.02] sm:text-5xl">
          Vragen van hoveniers
        </h2>
        <p className="mt-3 text-base text-lp-inkt-2">
          Laatst bijgewerkt: <time dateTime={LAATST_BIJGEWERKT.iso}>{LAATST_BIJGEWERKT.tekst}</time>
        </p>
        <div className="mt-10 border-t border-lp-lijn">
          {VRAGEN.map((v, i) => (
            <div key={v.vraag} className="grid gap-3 border-b border-lp-rand py-7 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12">
              <h3 className="text-xl font-semibold leading-snug">{v.vraag}</h3>
              <div>
                <p className="text-lg leading-relaxed">{v.antwoord}</p>
                {MEER[i] && (
                  <p className="mt-2 text-base">
                    <Link href={MEER[i].href} className="font-semibold underline decoration-lp-bos-700 decoration-2 underline-offset-4">
                      {MEER[i].label}
                    </Link>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
