// Centrale tekstbron voor alle <HelpTip>-popovers in het dashboard. Nieuwe
// uitleg toevoegen = hier een entry bijschrijven + <HelpTip contentKey="..." />
// in de JSX, zonder dat er een nieuw component nodig is.

type HelpEntry = { title: string; description: string };

type HelpTree = { [key: string]: HelpEntry | HelpTree };

export const helpContent = {
  branding: {
    autoDetect: {
      title: "Automatisch overnemen van je website",
      description:
        "We halen kleuren, lettertype, logo en teksten van je website op en vullen ze hieronder in als voorstel. Je kunt alles daarna nog aanpassen voordat je opslaat.",
    },
  },
  producten: {
    opbouw: {
      title: "Opbouw van een product",
      description:
        "Een product bestaat uit een basisprijs, optionele materiaalcategorieën en extra opties. De rekentool telt dit automatisch bij elkaar op tot een totaalprijs voor de klant.",
    },
    productVsDienst: {
      title: "Product versus dienst",
      description:
        "Een product is iets fysieks dat je levert of plaatst (bijv. een terras). Een dienst is werk zonder materiaal (bijv. een inspectie). Beide worden apart getoond in de rekentool.",
    },
    materiaalBandbreedte: {
      title: "Bandbreedte in plaats van vaste prijs",
      description:
        "Met bandbreedte toon je een minimum- en maximumprijs in plaats van één vast bedrag. Handig als de kostprijs van een materiaal kan variëren.",
    },
    extraOptieType: {
      title: "Per eenheid of per stuk",
      description:
        "“Per eenheid” schaalt automatisch mee met de hoeveelheid van het product. “Per stuk” heeft een eigen, los aantal dat de klant apart invult.",
    },
  },
  diensten: {
    bandbreedte: {
      title: "Bandbreedte in plaats van vaste prijs",
      description:
        "Met bandbreedte toon je een minimum- en maximumprijs in plaats van één vast bedrag. Handig als de tijdsbesteding van een dienst kan variëren.",
    },
  },
  kosteninstellingen: {
    bandbreedteModus: {
      title: "Prijsbandbreedte",
      description:
        "Toont klanten een range (bijv. €800 – €1.100) in plaats van één vast bedrag, door met een marge rond je berekende prijs te rekenen. Zo dek je onzekerheid in je kosten af zonder een exacte prijs te beloven.",
    },
    rekenEenheid: {
      title: "Reken in uren of dagen",
      description:
        "Bepaalt de eenheid waarin je arbeidskosten worden ingevoerd en berekend. Kies de eenheid die het beste aansluit bij hoe je zelf je tijd inschat.",
    },
    zichtbaarVsActief: {
      title: "Zichtbaar voor klant",
      description:
        "Deze kostenpost telt altijd mee in het totaalbedrag. Zet je ‘m uit, dan verdwijnt alleen de aparte regel uit het overzicht van de klant — de kosten blijven wel verrekend.",
    },
    btw: {
      title: "BTW-percentage",
      description:
        "Het percentage dat wordt opgeteld bovenop je totaalprijs. Dit geldt voor alle producten en diensten in je rekentool.",
    },
  },
  abonnement: {
    overrideTier: {
      title: "Handmatig toegekend abonnement",
      description:
        "Dit abonnement is door Kostenplan handmatig ingesteld, bijvoorbeeld voor een proefperiode of afspraak. Het wijkt af van wat er automatisch via je betaling zou gelden.",
    },
    upgradeDowngrade: {
      title: "Wisselen van abonnement",
      description:
        "Upgraden gaat direct in en geeft je meteen toegang tot extra functies. Downgraden gaat in aan het einde van de huidige factuurperiode, zodat je geen betaalde tijd verliest.",
    },
  },
  profiel: {
    multiCompany: {
      title: "Meerdere bedrijven",
      description:
        "Je kunt meerdere bedrijven beheren met één account. Wissel tussen bedrijven via de bedrijvenknop bovenin — elk bedrijf heeft zijn eigen producten, branding en instellingen.",
    },
  },
  leads: {
    statusKolommen: {
      title: "Statuskolommen",
      description:
        "Sleep een aanvraag naar een andere kolom om de status bij te werken. Zo houd je in één oogopslag bij waar elke lead in het proces zit.",
    },
    pipelineWaarde: {
      title: "Pipeline waarde",
      description:
        "De som van de geschatte waarde van alle openstaande aanvragen. Geeft een indicatie van hoeveel omzet er nog in behandeling is.",
    },
  },
  dashboard: {
    companySwitcher: {
      title: "Bedrijf wisselen",
      description:
        "Klik hier om te wisselen tussen de bedrijven die aan jouw account gekoppeld zijn. Elk bedrijf heeft zijn eigen producten, branding en instellingen.",
    },
  },
} as const satisfies HelpTree;

type DeepKeyOf<T, Prefix extends string = ""> = T extends HelpEntry
  ? Prefix
  : {
      [K in keyof T & string]: DeepKeyOf<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>;
    }[keyof T & string];

export type HelpContentKey = DeepKeyOf<typeof helpContent>;

export function getHelpContent(key: HelpContentKey): HelpEntry {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- runtime traversal van een compile-time gevalideerde dotted path
  let node: any = helpContent;
  for (const part of parts) {
    node = node[part];
  }
  return node as HelpEntry;
}
