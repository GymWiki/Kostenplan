import { PAKKETTEN, VERGELIJKING, LAATST_BIJGEWERKT, eur } from "@/app/lib/landing/feiten";
import { CtaLink } from "@/app/components/landing/cta-link";
import { Positie } from "@/app/components/landing/maat";
import { PRIJZEN } from "@/app/lib/subscription";

// Sectie 9: vergelijkingstabel met een maand/jaar-schakelaar die zonder
// JavaScript werkt (twee radioknoppen + CSS :has). Prijzen en limieten komen
// uit app/lib/subscription.ts, dezelfde bron als de betaling.
export function SectiePrijzen() {
  return (
    <section id="prijzen" aria-labelledby="h-prijzen" className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
      <div className="group/prijs">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Positie nr="09" label="Prijzen" />
            <h2 id="h-prijzen" className="mt-4 text-4xl font-semibold leading-[1.02] sm:text-5xl">
              Wat Kostenplan kost
            </h2>
            <p className="mt-3 text-base text-lp-inkt-2">
              Laatst bijgewerkt: <time dateTime={LAATST_BIJGEWERKT.iso}>{LAATST_BIJGEWERKT.tekst}</time>. Maandelijks opzegbaar.
            </p>
          </div>
          <fieldset className="overflow-hidden rounded-xl border border-lp-lijn">
            <legend className="sr-only">Betaalperiode</legend>
            <div className="flex">
              {[
                ["maand", "Per maand"],
                ["jaar", "Per jaar"],
              ].map(([v, l]) => (
                <label
                  key={v}
                  className="relative flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lp-oker has-[:checked]:bg-lp-bos-800 has-[:checked]:text-white"
                >
                  <input type="radio" name="periode" id={`periode-${v}`} value={v} defaultChecked={v === "maand"} className="absolute inset-0 cursor-pointer opacity-0" />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="lp-zacht mt-8 overflow-hidden rounded-3xl border border-lp-lijn bg-lp-wit px-1 sm:px-4">
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">Vergelijking van de pakketten Gratis, Plus en Pro</caption>
          <thead>
            <tr className="align-bottom">
              <td className="w-[34%] py-4 pr-2 sm:w-[37%]" />
              {PAKKETTEN.map((p) => (
                <th key={p.id} scope="col" className={`px-1.5 py-4 align-bottom sm:px-4 ${p.id === "PLUS" ? "bg-lp-bos-100" : ""}`}>
                  <span className="block text-base font-semibold sm:text-xl">{p.naam}</span>
                  <span className="mt-1 block font-lp-display text-xl font-semibold tabular-nums sm:text-3xl">
                    {p.maand === 0 ? (
                      "€ 0"
                    ) : (
                      <>
                        <span className="group-has-[#periode-jaar:checked]/prijs:hidden">{eur(p.maand)}</span>
                        <span className="hidden group-has-[#periode-jaar:checked]/prijs:inline">{eur(p.jaar)}</span>
                      </>
                    )}
                  </span>
                  <span className="block text-xs font-normal text-lp-inkt-2 sm:text-sm">
                    {p.maand === 0 ? (
                      "altijd gratis"
                    ) : (
                      <>
                        <span className="group-has-[#periode-jaar:checked]/prijs:hidden">per maand</span>
                        <span className="hidden group-has-[#periode-jaar:checked]/prijs:inline">per jaar</span>
                      </>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VERGELIJKING.map((r) => (
              <tr key={r.label} className="border-t border-lp-lijn">
                <th scope="row" className="py-3 pr-2 text-sm font-semibold sm:text-base">{r.label}</th>
                {r.waarden.map((w, i) => (
                  <td key={i} className={`px-1.5 py-3 text-[13px] leading-snug sm:px-4 sm:text-base ${i === 1 ? "bg-lp-bos-100" : ""} ${w === "Nee" ? "text-lp-inkt-2" : "font-semibold"}`}>
                    {w}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-lp-lijn">
              <td />
              {PAKKETTEN.map((p) => (
                <td key={p.id} className={`px-1.5 py-4 sm:px-4 ${p.id === "PLUS" ? "bg-lp-bos-100" : ""}`}>
                  <CtaLink href={p.id === "GRATIS" ? "/probeer" : "/registreren"} bron="prijzen" actie="pakket-kiezen" pakket={p.id} stijl={p.id === "PLUS" ? "primair" : "lijn"} className="min-h-11 w-full px-1 text-sm sm:text-base">
                    {p.id === "GRATIS" ? "Begin" : "Kies"}
                    <span className="sr-only"> met {p.naam}</span>
                  </CtaLink>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        </div>

        <p className="mt-4 text-sm text-lp-inkt-2">
          Jaarlijks: Plus {eur(PRIJZEN.PLUS.JAARLIJKS)} per jaar, Pro {eur(PRIJZEN.PRO.JAARLIJKS)} per jaar. Je kunt altijd eerst een voorbeeld bouwen; je kiest pas later een pakket.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-lp-lijn pt-8">
          <CtaLink href="/probeer" bron="prijzen" stijl="primair" className="w-full sm:w-auto">
            Begin gratis, zonder account
          </CtaLink>
          <p className="text-base text-lp-inkt-2">Je bouwt eerst een voorbeeld. Een account maak je pas als je het wilt bewaren.</p>
        </div>
      </div>
    </section>
  );
}
