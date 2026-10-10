import { WebsiteInvoer } from "@/app/components/landing/website-invoer";
import { CtaLink } from "@/app/components/landing/cta-link";

// Sectie 11: brede, rustige band in de accentkleur.
export function SectieAfsluiter() {
  return (
    <section aria-labelledby="h-afsluiter" className="border-t-[1.5px] border-lp-inkt bg-lp-oker text-lp-inkt">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
        <div>
          <h2 id="h-afsluiter" className="text-4xl font-extrabold leading-[1.02] sm:text-5xl">
            Bouw je rekentool vanavond nog.
          </h2>
          <p className="mt-4 max-w-xl text-lg">Vul je website in en je ziet je rekentool met je eigen logo en kleuren. Gratis, zonder account.</p>
        </div>
        <div className="flex flex-col gap-5">
          <WebsiteInvoer bron="afsluiter" op="oker" />
          <CtaLink href="/probeer" bron="afsluiter" stijl="bos" className="w-full sm:w-fit">
            Maak je rekentool, zonder website invullen
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
