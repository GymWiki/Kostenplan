// Config voor de doelgroep-landingspagina's onder /voor/[...]. Elke pagina
// importeert precies één entry hieruit en rendert die via
// app/components/marketing/doelgroep-landing.tsx — zo blijft de content per
// doelgroep op één centrale plek te bewerken, terwijl elke pagina toch een
// eigen URL, title en H1 heeft (zie de losse page.tsx-bestanden onder
// app/voor/).
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
        titel: "Eigen tarieven, altijd correct",
        tekst:
          "Stel je uurtarief, materiaalmarge en voorrijkosten eenmalig in. De rekentool past ze automatisch toe op elk product en elke dienst die je aanbiedt.",
      },
      {
        titel: "Alleen serieuze aanvragen",
        tekst:
          "Klanten zien vooraf een realistische indicatie. Wie dan alsnog een offerte aanvraagt, heeft al een budget in gedachten.",
      },
      {
        titel: "Geen software-gedoe",
        tekst:
          "Geen installatie, geen ingewikkelde configuratie. Binnen een paar minuten heb je een werkende rekentool voor je website.",
      },
    ],
  },
  {
    slug: "stratenmakers",
    naam: "stratenmaker",
    naamMeervoud: "stratenmakers",
    projectVoorbeeld: "bestrating",
    title: "Offertecalculator voor Stratenmakers",
    description:
      "Laat klanten zelf een prijsindicatie voor bestrating berekenen. Ontvang alleen serieuze aanvragen in je eigen leads-CRM. Start gratis.",
    h1: "Prijsberekening voor stratenmakers, zonder losse offertes te typen",
    intro:
      "Als stratenmaker krijg je veel aanvragen voor bestrating waarvan een groot deel nooit een klant wordt. Met Kostenplan berekenen bezoekers zelf een prijsindicatie voor hun bestratingsproject — jij ontvangt alleen aanvragen van mensen die al weten wat het ongeveer gaat kosten.",
    voordelen: [
      {
        titel: "Eigen tarieven, altijd correct",
        tekst:
          "Stel je uurtarief, materiaalmarge en voorrijkosten eenmalig in. De rekentool past ze automatisch toe op elk product en elke dienst die je aanbiedt.",
      },
      {
        titel: "Alleen serieuze aanvragen",
        tekst:
          "Klanten zien vooraf een realistische indicatie. Wie dan alsnog een offerte aanvraagt, heeft al een budget in gedachten.",
      },
      {
        titel: "Geen software-gedoe",
        tekst:
          "Geen installatie, geen ingewikkelde configuratie. Binnen een paar minuten heb je een werkende rekentool voor je website.",
      },
    ],
  },
  {
    slug: "schilders",
    naam: "schilder",
    naamMeervoud: "schilders",
    projectVoorbeeld: "schilderwerk",
    title: "Offertecalculator voor Schilders",
    description:
      "Laat klanten zelf een prijsindicatie voor schilderwerk berekenen. Ontvang alleen serieuze aanvragen in je eigen leads-CRM. Start gratis.",
    h1: "Prijsberekening voor schilders, zonder losse offertes te typen",
    intro:
      "Als schilder bel of mail je terug op aanvragen die vaak alleen maar willen 'weten wat het kost'. Met Kostenplan berekenen bezoekers zelf een prijsindicatie voor hun schilderklus — jij ontvangt alleen aanvragen van mensen die al weten wat het ongeveer gaat kosten.",
    voordelen: [
      {
        titel: "Eigen tarieven, altijd correct",
        tekst:
          "Stel je uurtarief, materiaalmarge en voorrijkosten eenmalig in. De rekentool past ze automatisch toe op elk product en elke dienst die je aanbiedt.",
      },
      {
        titel: "Alleen serieuze aanvragen",
        tekst:
          "Klanten zien vooraf een realistische indicatie. Wie dan alsnog een offerte aanvraagt, heeft al een budget in gedachten.",
      },
      {
        titel: "Geen software-gedoe",
        tekst:
          "Geen installatie, geen ingewikkelde configuratie. Binnen een paar minuten heb je een werkende rekentool voor je website.",
      },
    ],
  },
  {
    slug: "klusbedrijven",
    naam: "klusbedrijf",
    naamMeervoud: "klusbedrijven",
    projectVoorbeeld: "verbouwing",
    title: "Offertecalculator voor Klusbedrijven",
    description:
      "Laat klanten zelf een prijsindicatie voor een verbouwing of klus berekenen. Ontvang alleen serieuze aanvragen in je eigen leads-CRM. Start gratis.",
    h1: "Prijsberekening voor klusbedrijven, zonder losse offertes te typen",
    intro:
      "Als klusbedrijf krijg je aanvragen voor uiteenlopende klussen, van klein tot groot. Met Kostenplan berekenen bezoekers zelf een prijsindicatie voor hun project — jij ontvangt alleen aanvragen van mensen die al weten wat het ongeveer gaat kosten.",
    voordelen: [
      {
        titel: "Eigen tarieven, altijd correct",
        tekst:
          "Stel je uurtarief, materiaalmarge en voorrijkosten eenmalig in. De rekentool past ze automatisch toe op elk product en elke dienst die je aanbiedt.",
      },
      {
        titel: "Alleen serieuze aanvragen",
        tekst:
          "Klanten zien vooraf een realistische indicatie. Wie dan alsnog een offerte aanvraagt, heeft al een budget in gedachten.",
      },
      {
        titel: "Geen software-gedoe",
        tekst:
          "Geen installatie, geen ingewikkelde configuratie. Binnen een paar minuten heb je een werkende rekentool voor je website.",
      },
    ],
  },
];

export function getDoelgroep(slug: string): Doelgroep | undefined {
  return DOELGROEPEN.find((d) => d.slug === slug);
}
