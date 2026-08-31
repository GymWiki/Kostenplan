"use client";

import { useState } from "react";
import { WebsiteCalculatorMockup, type MockupVeld } from "@/app/components/marketing/website-calculator-mockup";
import { cn } from "@/app/lib/cn";

type UseCase = {
  key: string;
  label: string;
  siteUrl: string;
  bedrijfsnaam: string;
  productTitel: string;
  velden: MockupVeld[];
  resultaatLabel?: string;
  resultaatWaarde: string;
  cta: string;
};

const USE_CASES: UseCase[] = [
  {
    key: "hovenier",
    label: "Hovenier",
    siteUrl: "groenenzo.nl",
    bedrijfsnaam: "Groen & Zo Tuinen",
    productTitel: "Bereken de kosten van jouw tuin",
    velden: [
      { label: "Oppervlakte tuin", waarde: "85 m²" },
      { label: "Bestrating", waarde: "Ja" },
      { label: "Schutting", waarde: "12 m1" },
    ],
    resultaatWaarde: "€ 8.250 – € 10.500",
    cta: "Offerte aanvragen",
  },
  {
    key: "schutting",
    label: "Schuttingbedrijf",
    siteUrl: "schuttingdirect.nl",
    bedrijfsnaam: "SchuttingDirect",
    productTitel: "Bereken jouw schutting",
    velden: [
      { label: "Lengte", waarde: "18 m1" },
      { label: "Hoogte", waarde: "180 cm" },
      { label: "Materiaal", waarde: "Hardhout" },
    ],
    resultaatLabel: "Vanaf",
    resultaatWaarde: "€ 2.950",
    cta: "Vraag offerte aan",
  },
  {
    key: "kozijnen",
    label: "Kozijnenbedrijf",
    siteUrl: "vandijkkozijnen.nl",
    bedrijfsnaam: "Van Dijk Kozijnen",
    productTitel: "Bereken je nieuwe kozijnen",
    velden: [
      { label: "Aantal kozijnen", waarde: "6" },
      { label: "Materiaal", waarde: "Kunststof" },
      { label: "Glas", waarde: "HR++" },
    ],
    resultaatLabel: "Indicatie vanaf",
    resultaatWaarde: "€ 7.850",
    cta: "Ontvang mijn prijs",
  },
  {
    key: "bouw",
    label: "Bouwbedrijf",
    siteUrl: "vanderbergbouw.nl",
    bedrijfsnaam: "Van der Berg Bouw",
    productTitel: "Bereken je verbouwing",
    velden: [
      { label: "Type verbouwing", waarde: "Aanbouw" },
      { label: "Oppervlakte", waarde: "24 m²" },
      { label: "Afwerking", waarde: "Compleet" },
    ],
    resultaatLabel: "Indicatie vanaf",
    resultaatWaarde: "€ 15.500",
    cta: "Offerte aanvragen",
  },
];

// "Eén platform. Ontelbaar veel rekentools." (SEO/GEO-opdracht "interactieve
// productdemo's", Deel 12/13): i.p.v. vier statische mockups naast elkaar,
// wisselt de bezoeker zelf tussen vakgebieden — dezelfde WebsiteCalculatorMockup,
// alleen de inhoud verandert. De remount via `key` triggert de al bestaande
// animate-fade-in-up-animatie (globals.css, respecteert prefers-reduced-motion
// al) — geen aparte transitiemachine nodig voor een subtiele overgang.
export function UseCaseSwitcher() {
  const [activeKey, setActiveKey] = useState(USE_CASES[0].key);
  const active = USE_CASES.find((u) => u.key === activeKey) ?? USE_CASES[0];

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Voorbeeld per vakgebied">
        {USE_CASES.map((u) => (
          <button
            key={u.key}
            type="button"
            role="tab"
            aria-selected={u.key === activeKey}
            onClick={() => setActiveKey(u.key)}
            className={cn(
              "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              u.key === activeKey
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            {u.label}
          </button>
        ))}
      </div>

      <div key={active.key} className="w-full max-w-sm animate-fade-in-up">
        <WebsiteCalculatorMockup
          siteUrl={active.siteUrl}
          bedrijfsnaam={active.bedrijfsnaam}
          productTitel={active.productTitel}
          velden={active.velden}
          resultaatLabel={active.resultaatLabel}
          resultaatWaarde={active.resultaatWaarde}
          cta={active.cta}
        />
      </div>
    </div>
  );
}
