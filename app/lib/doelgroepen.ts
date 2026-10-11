import { isZichtbareDoelgroep } from "@/app/lib/trade-config";

// Config voor de doelgroep-landingspagina onder /voor/hoveniers (Kostenplan is er alleen voor hoveniers; oude pagina's voor andere vakgebieden sturen via next.config.ts door). Elke pagina
// importeert precies één entry hieruit en rendert die via
// app/components/marketing/doelgroep-landing.tsx — zo blijft de content per
// doelgroep op één centrale plek te bewerken, terwijl elke pagina toch een
// eigen URL, title en H1 heeft (zie de losse page.tsx-bestanden onder
// app/voor/).
//
// `voordelen` en `faqs` zijn bewust per doelgroep volledig eigen tekst (geen
// gedeelde generieke tekst met een ingevuld keyword) — anders zijn dit
// bijna-identieke pagina's die geen van alle echt nuttige, vakspecifieke
// informatie bieden.
export type Doelgroep = {
  slug: string;
  naam: string;
  naamMeervoud: string;
  projectVoorbeeld: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  voordelen: { titel: string; tekst: string }[];
  faqs: { vraag: string; antwoord: string }[];
};

export const DOELGROEPEN: Doelgroep[] = [
  {
    slug: "hoveniers",
    naam: "hovenier",
    naamMeervoud: "hoveniers",
    projectVoorbeeld: "tuinaanleg",
    title: "Offertecalculator voor Hoveniers",
    description:
      "Laat klanten zelf een prijsindicatie voor tuinaanleg berekenen. Ontvang alleen serieuze aanvragen in je eigen leads-CRM. Start gratis.",
    h1: "Prijsberekening voor hoveniers, zonder losse offertes te typen",
    intro:
      "Als hovenier besteed je uren aan het uitrekenen van tuinaanleg-offertes voor klanten die uiteindelijk toch niet kiezen voor jouw bedrijf. Met Kostenplan berekenen bezoekers zelf een prijsindicatie voor hun tuinproject — jij ontvangt alleen aanvragen van mensen die al weten wat het ongeveer gaat kosten.",
    voordelen: [
      {
        titel: "Eén tuin, meerdere onderdelen",
        tekst:
          "Combineer bestrating, een schutting, kunstgras, beplanting en grondwerk in één berekening, zodat een klant direct een totaalprijs voor de hele tuin ziet in plaats van losse deelprijzen.",
      },
      {
        titel: "Rekening houden met bereikbaarheid",
        tekst:
          "Stel voorwaardelijke vragen in, bijvoorbeeld over een poort of een smalle achterom, zodat de prijsindicatie automatisch een toeslag voor extra arbeid meerekent wanneer dat nodig is.",
      },
      {
        titel: "Per m² of per meter, jouw keuze",
        tekst:
          "Reken bestrating en kunstgras per vierkante meter en een schutting per strekkende meter — elk onderdeel krijgt de rekeneenheid die logisch is voor dat werk.",
      },
    ],
    faqs: [
      {
        vraag: "Kan ik een complete tuinaanleg laten berekenen, of alleen losse onderdelen?",
        antwoord:
          "Beide kan. Je kunt één rekentool bouwen die bestrating, schutting, kunstgras, beplanting en grondwerk combineert tot één tuinaanleg-totaalprijs, of losse rekentools maken voor bijvoorbeeld alleen bestrating.",
      },
      {
        vraag: "Kan ik verschillende materialen en prijzen per vierkante meter instellen?",
        antwoord:
          "Ja. Voor elk materiaal (bijvoorbeeld gebakken klinkers versus natuursteen) stel je een eigen prijs per vierkante meter in, zodat de klant zelf de materiaalkeuze maakt en de prijs daar automatisch op aanpast.",
      },
      {
        vraag: "Kan ik een toeslag instellen voor moeilijk bereikbare tuinen?",
        antwoord:
          "Ja, met een voorwaardelijke prijsregel. Je stelt een vraag in over bereikbaarheid en koppelt daar een extra arbeidskostenregel aan die alleen meetelt wanneer de klant 'slecht bereikbaar' aangeeft.",
      },
    ],
  },
];

// Alleen de doelgroepen die we nu actief aanbieden (zie trade-config.ts).
export const ZICHTBARE_DOELGROEPEN = DOELGROEPEN.filter((d) => isZichtbareDoelgroep(d.slug));

export function getDoelgroep(slug: string): Doelgroep | undefined {
  return DOELGROEPEN.find((d) => d.slug === slug);
}
