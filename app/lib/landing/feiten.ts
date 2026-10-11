import { PLAN_LIMITS, PRIJZEN } from "@/app/lib/subscription";

// Eén bron voor alle feiten op de landingspagina, het JSON-LD en /llms.txt, zodat
// ze nooit uit elkaar lopen. Prijzen en limieten komen uit de code die ook de
// betaling en de rechten bepaalt (app/lib/subscription.ts).

export const SITE_URL = "https://www.kostenplan.nl";

export const DEFINITIE =
  "Kostenplan is een online rekentool voor hoveniers in Nederland waarmee klanten op de website van de hovenier zelf de prijs van bijvoorbeeld een schutting, terras of gazon berekenen en een aanvraag versturen.";

export const KOPREGEL = "Je klant weet de prijs al voordat hij belt.";

// Zichtbaar bij prijzen en vragen; bij elke inhoudelijke wijziging bijwerken.
export const LAATST_BIJGEWERKT = { iso: "2026-10-10", tekst: "10 oktober 2026" };

export const BEDRIJF = {
  naam: "GymWiki",
  handelsnaam: "Kostenplan",
  kvk: "97351911",
  btw: "NL005266843B58",
  plaats: "Zwolle",
  land: "NL",
  email: "pieter@kostenplan.nl",
};

export const eur = (n: number) => `€\u00a0${n.toLocaleString("nl-NL")}`;

export const PAKKETTEN = [
  {
    id: "GRATIS" as const,
    naam: "Gratis",
    maand: 0,
    jaar: 0,
    kort: "Zelf uitproberen en een eerste rekentool delen via een link.",
  },
  {
    id: "PLUS" as const,
    naam: "Plus",
    maand: PRIJZEN.PLUS.MAANDELIJKS,
    jaar: PRIJZEN.PLUS.JAARLIJKS,
    kort: "Eigen huisstijl en aanvragen ontvangen.",
  },
  {
    id: "PRO" as const,
    naam: "Pro",
    maand: PRIJZEN.PRO.MAANDELIJKS,
    jaar: PRIJZEN.PRO.JAARLIJKS,
    kort: "Onbeperkt rekentools en insluiten op je eigen website.",
  },
];

const grens = (n: number | null) => (n === null ? "Onbeperkt" : String(n));

// Rijen van de vergelijkingstabel (alleen wat de code echt afdwingt).
export const VERGELIJKING: { label: string; waarden: [string, string, string] }[] = [
  {
    label: "Rekentools (aantal)",
    waarden: [
      grens(PLAN_LIMITS.GRATIS.maxActiveTools),
      grens(PLAN_LIMITS.PLUS.maxActiveTools),
      grens(PLAN_LIMITS.PRO.maxActiveTools),
    ],
  },
  {
    label: "Werkzaamheden",
    waarden: [
      `Tot ${PLAN_LIMITS.GRATIS.maxProductsPerCompany}`,
      "Onbeperkt",
      "Onbeperkt",
    ],
  },
  { label: "Prijzen, werktempo en tarieven instellen", waarden: ["Ja", "Ja", "Ja"] },
  {
    label: "Eigen logo en kleuren",
    waarden: [PLAN_LIMITS.GRATIS.customBranding ? "Ja" : "Nee", PLAN_LIMITS.PLUS.customBranding ? "Ja" : "Nee", PLAN_LIMITS.PRO.customBranding ? "Ja" : "Nee"],
  },
  { label: "Aanvragen en offertes van klanten", waarden: ["Nee", "Ja", "Ja"] },
  {
    label: "Op je website",
    waarden: [
      PLAN_LIMITS.GRATIS.embedEnabled ? "Link of insluiten" : "Link",
      PLAN_LIMITS.PLUS.embedEnabled ? "Link of insluiten" : "Link",
      PLAN_LIMITS.PRO.embedEnabled ? "Link of insluiten" : "Link",
    ],
  },
  { label: "“Powered by Kostenplan” in de rekentool", waarden: ["Ja", "Nee", "Nee"] },
  { label: "Prioriteit bij support", waarden: ["Nee", "Nee", "Ja"] },
];

// Elk antwoord begint met een direct antwoord (40–60 woorden) en is zo
// letterlijk te citeren. Zie app/lib/landing/feiten.test.ts.
export const VRAGEN: { vraag: string; antwoord: string }[] = [
  {
    vraag: "Hoe maak ik sneller een offerte als hovenier?",
    antwoord:
      "Laat je klant de prijs eerst zelf berekenen. Je zet je materiaalprijzen, werktempo en dagdeeltarief één keer in Kostenplan en de rekentool rekent daarmee elke klus door. Een aanvraag komt binnen met m², materiaal en prijs; jij past een conceptofferte aan en verstuurt hem. Aanvragen en offertes zijn er vanaf Plus.",
  },
  {
    vraag: "Hoe voorkom ik prijsaanvragen van klanten die niets afnemen?",
    antwoord:
      "Toon de prijs vóórdat een klant contact opneemt. Wie op jouw website een prijs ziet en daarna toch een aanvraag stuurt, weet wat het ongeveer kost. Je krijgt daardoor minder oriënterende telefoontjes en meer aanvragen waarbij de prijs geen verrassing meer is. Een garantie op aantallen geven we niet; het scheelt wel uitzoekwerk.",
  },
  {
    vraag: "Kan ik een prijscalculator op mijn website zetten?",
    antwoord:
      "Ja. Je bouwt je rekentool in Kostenplan en zet hem op je website. Met Pro sluit je hem in je eigen pagina in met een stukje code (iframe). Met Gratis en Plus deel je de link naar je rekentool, bijvoorbeeld achter een knop op je website of in een e-mail.",
  },
  {
    vraag: "Werkt het met WordPress, Wix of Squarespace?",
    antwoord:
      "Ja. Het insluiten werkt met elke website waarop je een stukje HTML kunt plaatsen. In Kostenplan staat een korte uitleg voor WordPress, Wix, Squarespace en Jouwweb, plus een algemene voor andere websites. Insluiten is onderdeel van Pro; een link naar je rekentool werkt op elke website en in elk pakket.",
  },
  {
    vraag: "Wat kost Kostenplan?",
    antwoord: `Starten is gratis. Plus kost ${eur(PRIJZEN.PLUS.MAANDELIJKS)} per maand (${eur(PRIJZEN.PLUS.JAARLIJKS)} per jaar) en Pro ${eur(PRIJZEN.PRO.MAANDELIJKS)} per maand (${eur(PRIJZEN.PRO.JAARLIJKS)} per jaar). Maandelijks opzeggen kan altijd. Je bouwt eerst gratis een voorbeeld zonder account en kiest pas later een pakket, bijvoorbeeld wanneer je aanvragen wilt ontvangen. Het verschil per pakket staat in de vergelijkingstabel.`,
  },
  {
    vraag: "Moet ik verstand hebben van computers?",
    antwoord:
      "Nee. Je kiest je werkzaamheden uit een lijst met voorbeeldprijzen, past de prijzen aan naar de jouwe en klikt in je rekentool op wat je wilt wijzigen. Op de proefpagina bouw je een voorbeeld zonder account; een eerste rekentool staat in een paar minuten klaar.",
  },
  {
    vraag: "Haalt Kostenplan mijn logo en kleuren van mijn website?",
    antwoord:
      "Ja, als je je website invult haalt Kostenplan daar je logo en hoofdkleur vandaan, zodat de rekentool eruitziet als onderdeel van je bedrijf. Lukt dat niet, dan voeg je je logo zelf toe. Eigen logo en kleuren in een gepubliceerde rekentool zijn onderdeel van Plus en Pro.",
  },
];

export const WEBSITEBOUWERS = ["WordPress", "Wix", "Squarespace", "Jouwweb"];
