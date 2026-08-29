"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/app/lib/cn";

export type Faq = { vraag: string; antwoord: string };

const HOMEPAGE_FAQS: Faq[] = [
  {
    vraag: "Wat is een rekentool voor een website?",
    antwoord:
      "Een rekentool is een interactief onderdeel op je website waarmee een bezoeker zelf, op basis van eigen invoer zoals oppervlakte, materiaalkeuze of aantal, direct een prijsindicatie te zien krijgt — in plaats van dat hij hiervoor moet bellen of mailen.",
  },
  {
    vraag: "Kan ik zelf een rekentool maken zonder programmeerkennis?",
    antwoord:
      "Ja. Je kiest een sjabloon voor jouw vakgebied of begint helemaal vanaf 0, en stelt daarna via een visuele bouwer je eigen vragen, prijzen en voorwaarden in — zonder code of technische kennis.",
  },
  {
    vraag: "Kan ik de rekentool op mijn eigen website plaatsen?",
    antwoord:
      "Ja. Je plaatst de rekentool met een korte embedcode op je eigen pagina, of je deelt de directe link — bijvoorbeeld in je e-mailhandtekening of op social media. Er is geen hosting of ontwikkelaar voor nodig.",
  },
  {
    vraag: "Hoe voeg ik mijn eigen prijzen en tarieven toe?",
    antwoord:
      "Na het aanmaken van je account stel je eenmalig je kosteninstellingen in (uurtarief, voorrijkosten, materiaalmarge en btw). Daarna voeg je je eigen producten met hun prijzen toe. De rekentool berekent automatisch een prijsindicatie op basis van jouw tarieven — nooit die van iemand anders.",
  },
  {
    vraag: "Wat gebeurt er nadat een klant een offerte aanvraagt via mijn rekentool?",
    antwoord:
      "De aanvraag verschijnt direct in je Leads-overzicht (vanaf het Plus-pakket), inclusief de exacte selectie en prijsindicatie van de klant. Je houdt de status bij op een Kanban-bord en belt, mailt of appt met één klik vanuit het dashboard.",
  },
  {
    vraag: "Is er een gratis pakket of een proefperiode nodig?",
    antwoord:
      "Je gebruikt Kostenplan volledig gratis met tot 10 producten, zonder tijdslimiet en zonder creditcard. Wil je onbeperkt producten, je eigen huisstijl of het leads-overzicht? Dan upgrade je naar Plus of Pro.",
  },
];

// Herbruikbare FAQ-sectie mét FAQPage-JSON-LD (Deel 5/6 van de SEO/GEO-
// opdracht: elke belangrijke pagina krijgt zijn eigen, op die pagina
// toegespitste vragen — self-contained te begrijpen los van context, zodat
// zowel Google's FAQ-rich-results als AI-antwoordmachines ze rechtstreeks
// kunnen citeren). Zonder `faqs`-prop valt dit terug op de oorspronkelijke
// homepage-vragen, zodat bestaande aanroepen (<FaqSection />) ongewijzigd
// blijven werken.
export function FaqSection({
  faqs = HOMEPAGE_FAQS,
  id = "faq",
  titel = "Veelgestelde vragen",
  intro = "Staat je vraag er niet bij? Mail ons gerust via de footer hieronder.",
}: {
  faqs?: Faq[];
  id?: string;
  titel?: string;
  intro?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.vraag,
      acceptedAnswer: { "@type": "Answer", text: faq.antwoord },
    })),
  };

  return (
    <section id={id} className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{titel}</h2>
        <p className="mt-3 text-muted-foreground">{intro}</p>
      </div>

      <div className="mt-10 flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {faqs.map((faq, index) => {
          const open = openIndex === index;
          return (
            <div key={faq.vraag}>
              <h3>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  aria-expanded={open}
                  aria-controls={`faq-answer-${index}`}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="font-medium text-foreground">{faq.vraag}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                      open && "rotate-180"
                    )}
                  />
                </button>
              </h3>
              <div
                id={`faq-answer-${index}`}
                role="region"
                className={cn(
                  "grid overflow-hidden transition-all duration-300 ease-out",
                  open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="min-h-0">
                  <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {faq.antwoord}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
