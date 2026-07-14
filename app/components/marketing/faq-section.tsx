"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/app/lib/cn";

const FAQS = [
  {
    vraag: "Zit ik direct vast aan een contract als ik upgrade naar een betaald pakket?",
    antwoord:
      "Nee. Plus en Pro zijn flexibele maandelijkse of jaarlijkse abonnementen zonder verplichte looptijd. Je kunt op elk moment upgraden, downgraden naar Gratis of opzeggen via je dashboard.",
  },
  {
    vraag: "Hoe voeg ik mijn eigen prijzen en tarieven toe?",
    antwoord:
      "Na het aanmaken van je account stel je eenmalig je kosteninstellingen in (uurtarief, voorrijkosten, materiaalmarge en btw). Daarna voeg je je eigen diensten en producten met hun prijzen toe. De rekentool berekent automatisch een prijsindicatie op basis van jouw tarieven — nooit die van iemand anders.",
  },
  {
    vraag: "Werkt Kostenplan ook voor andere vakmensen dan hoveniers?",
    antwoord:
      "Zeker. Kostenplan is ontworpen met hoveniersbedrijven in gedachten, maar werkt net zo goed voor stratenmakers, schilders, klussenbedrijven en andere vakmensen die offertes baseren op arbeid, materiaal en transport.",
  },
  {
    vraag: "Wat gebeurt er nadat een klant een offerte aanvraagt via mijn rekentool?",
    antwoord:
      "De aanvraag verschijnt direct in je Leads-overzicht (vanaf het Plus-pakket), inclusief de exacte selectie en prijsindicatie van de klant. Je houdt de status bij op een Kanban-bord en belt, mailt of appt met één klik vanuit het dashboard.",
  },
  {
    vraag: "Is er een gratis pakket of een proefperiode nodig?",
    antwoord:
      "Je gebruikt Kostenplan volledig gratis met tot 10 diensten en producten, zonder tijdslimiet en zonder creditcard. Wil je onbeperkt diensten en producten, je eigen huisstijl of het leads-overzicht? Dan upgrade je naar Plus of Pro.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.vraag,
      acceptedAnswer: { "@type": "Answer", text: faq.antwoord },
    })),
  };

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Veelgestelde vragen
        </h2>
        <p className="mt-3 text-muted-foreground">
          Staat je vraag er niet bij? Mail ons gerust via de footer hieronder.
        </p>
      </div>

      <div className="mt-10 flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {FAQS.map((faq, index) => {
          const open = openIndex === index;
          return (
            <div key={faq.vraag}>
              <h3>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  aria-expanded={open}
                  aria-controls={`faq-answer-${index}`}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
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
