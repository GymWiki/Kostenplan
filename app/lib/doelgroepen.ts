// Config voor de doelgroep-landingspagina's onder /voor/[...]. Elke pagina
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
        titel: "Prijs per vierkante meter, per materiaal",
        tekst:
          "Stel voor elke steensoort — gebakken klinkers, betontegels, natuursteen — een eigen prijs per vierkante meter in, zodat de klant direct ziet wat materiaalkeuze scheelt.",
      },
      {
        titel: "Oude bestrating opnemen",
        tekst:
          "Voeg een aparte prijsregel toe voor het opbreken en afvoeren van bestaande bestrating, zodat vervangingsprojecten niet worden onderschat in de indicatie.",
      },
      {
        titel: "Grondwerk als los onderdeel",
        tekst:
          "Reken uitgraven en een zandbed als apart onderdeel mee, alleen zichtbaar wanneer de klant aangeeft dat er nog geen ondergrond ligt.",
      },
    ],
    faqs: [
      {
        vraag: "Kan ik verschillende soorten bestrating tegelijk aanbieden?",
        antwoord:
          "Ja. Je kunt meerdere materiaalopties (bijvoorbeeld klinkers, betontegels en natuursteen) instellen met elk hun eigen prijs per vierkante meter, waar de klant zelf uit kiest tijdens de berekening.",
      },
      {
        vraag: "Kan ik het opbreken van oude bestrating apart doorrekenen?",
        antwoord:
          "Ja. Je voegt een prijsregel toe voor opbreken en afvoeren die je koppelt aan een vraag als 'ligt er al bestrating?', zodat die kosten alleen meetellen wanneer dat daadwerkelijk aan de orde is.",
      },
      {
        vraag: "Werkt de berekening ook voor grote opritten en bedrijventerreinen?",
        antwoord:
          "Ja, de prijs schaalt automatisch mee met de ingevoerde oppervlakte. Voor projecten met sterk afwijkende omstandigheden (bijvoorbeeld zware belasting door vrachtverkeer) blijft de uitkomst een indicatie die je vóór een definitieve offerte nog beoordeelt.",
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
        titel: "Aantal lagen bepaalt de prijs",
        tekst:
          "Reken een prijs per laag verf, zodat het verschil tussen bijwerken (één laag) en volledig overschilderen (meerdere lagen) automatisch in de indicatie doorwerkt.",
      },
      {
        titel: "Ondergrond als aparte factor",
        tekst:
          "Voeg een voorbereidingsstap toe voor schuren, plamuren of een grondlaag op een slechte ondergrond, met een eigen toeslag die alleen geldt wanneer nodig.",
      },
      {
        titel: "Binnen én buiten in één tool",
        tekst:
          "Bouw aparte onderdelen voor binnenschilderwerk en buitenschilderwerk (kozijnen, gevels), zodat één rekentool het hele aanbod dekt zonder dat vragen door elkaar lopen.",
      },
    ],
    faqs: [
      {
        vraag: "Kan ik rekening houden met het aantal verflagen?",
        antwoord:
          "Ja. Je stelt een prijs per laag in en laat de klant aangeven hoeveel lagen nodig zijn (bijvoorbeeld bijwerken versus volledig overschilderen), zodat dat verschil automatisch in de prijsindicatie zit.",
      },
      {
        vraag: "Kan ik een toeslag instellen voor een slechte ondergrond?",
        antwoord:
          "Ja, met een voorwaardelijke prijsregel voor extra voorbereiding zoals schuren of plamuren, die alleen wordt meegeteld wanneer de klant aangeeft dat de ondergrond dat vereist.",
      },
      {
        vraag: "Kan ik binnen- en buitenschilderwerk in dezelfde rekentool aanbieden?",
        antwoord:
          "Ja. Je kunt beide als apart onderdeel binnen één rekentool combineren, of er twee losse rekentools voor maken — wat het overzichtelijkst is hangt af van hoeveel vragen elk onderdeel nodig heeft.",
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
        titel: "Meerdere rekentools naast elkaar",
        tekst:
          "Bouw een aparte rekentool per type klus — bijvoorbeeld een badkamerverbouwing, montagewerk of stucwerk — zodat elke klant alleen de vragen ziet die voor zijn klus relevant zijn.",
      },
      {
        titel: "Arbeid als vaste basis",
        tekst:
          "Reken een deel van elke klus op basis van geschatte arbeidsuren tegen jouw uurtarief, gecombineerd met materiaalregels voor de onderdelen die wel goed vooraf te prijzen zijn.",
      },
      {
        titel: "Kleine klussen automatisch filteren",
        tekst:
          "Een zichtbare ondergrens in de prijsindicatie voorkomt dat je tijd kwijt bent aan te kleine klussen die niet rendabel zijn om in te plannen.",
      },
    ],
    faqs: [
      {
        vraag: "Kan ik voor elk type klus een eigen rekentool maken?",
        antwoord:
          "Ja. Je kunt zoveel rekentools maken als je wilt, elk met een eigen link — bijvoorbeeld één voor badkamerklussen en één voor algemeen montagewerk — zodat een klant alleen relevante vragen krijgt.",
      },
      {
        vraag: "Kan ik arbeidsuren en materiaalkosten samen laten meetellen?",
        antwoord:
          "Ja. Je combineert een prijsregel op basis van geschatte arbeidsuren met losse materiaalregels binnen hetzelfde onderdeel, zodat de indicatie beide meeneemt.",
      },
      {
        vraag: "Kan ik voorkomen dat ik aanvragen krijg voor te kleine klussen?",
        antwoord:
          "Je kunt een vaste minimumbijdrage in de prijsopbouw verwerken, zodat de indicatie voor een hele kleine klus meteen laat zien dat er een minimumtarief geldt — dat filtert vooraf al een deel van de te kleine aanvragen.",
      },
    ],
  },
  {
    slug: "keukenbedrijven",
    naam: "keukenbedrijf",
    naamMeervoud: "keukenbedrijven",
    projectVoorbeeld: "een nieuwe keuken",
    title: "Offertecalculator voor Keukenbedrijven",
    description:
      "Laat klanten zelf een prijsindicatie voor een nieuwe keuken berekenen — kasten, werkblad en apparatuur. Ontvang alleen serieuze aanvragen. Start gratis.",
    h1: "Prijsberekening voor keukenbedrijven, zonder losse offertes te typen",
    intro:
      "Een keukenofferte bestaat uit veel losse onderdelen — kasten, werkblad, apparatuur — die je normaal pas na een winkelbezoek of thuisopname kunt prijzen. Met Kostenplan berekenen bezoekers zelf een eerste prijsindicatie voor hun keukenwensen, zodat jij alleen tijd steekt in klanten die al een reëel beeld van het budget hebben.",
    voordelen: [
      {
        titel: "Kasten, werkblad en apparatuur apart geprijsd",
        tekst:
          "Bouw de keukenopstelling op uit losse onderdelen — kastenwand, werkblad per materiaal en gewenste apparatuur — die samen tot één keukentotaal optellen.",
      },
      {
        titel: "Werkbladmateriaal bepaalt de prijs per meter",
        tekst:
          "Stel voor elk werkbladmateriaal (composiet, natuursteen, laminaat) een eigen prijs per strekkende meter in, zodat de klant direct het effect van zijn materiaalkeuze ziet.",
      },
      {
        titel: "Apparatuur als aanvinkbare opties",
        tekst:
          "Laat de klant zelf aanvinken welke apparatuur (oven, kookplaat, vaatwasser) hij wil laten inbouwen, elk met een eigen prijs die automatisch bij het totaal wordt opgeteld.",
      },
    ],
    faqs: [
      {
        vraag: "Kan ik een complete keuken laten berekenen, inclusief apparatuur?",
        antwoord:
          "Ja. Je combineert kastenwand, werkblad en apparatuur als losse onderdelen binnen één rekentool, die samen tot één totaalprijs voor de hele keuken optellen.",
      },
      {
        vraag: "Kan een klant zelf kiezen welke apparatuur hij wil?",
        antwoord:
          "Ja, met een meerkeuzevraag: de klant vinkt aan welke apparaten (bijvoorbeeld oven, kookplaat, vaatwasser) hij wil laten inbouwen, en alleen de aangevinkte opties tellen mee in de prijs.",
      },
      {
        vraag: "Kan ik verschillende werkbladmaterialen met verschillende prijzen aanbieden?",
        antwoord:
          "Ja. Je stelt per materiaal (bijvoorbeeld composiet of natuursteen) een eigen prijs per strekkende meter in, zodat de prijsindicatie automatisch meebeweegt met de gekozen materiaalkwaliteit.",
      },
    ],
  },
  {
    slug: "badkamerbedrijven",
    naam: "badkamerbedrijf",
    naamMeervoud: "badkamerbedrijven",
    projectVoorbeeld: "een nieuwe badkamer",
    title: "Offertecalculator voor Badkamerbedrijven",
    description:
      "Laat klanten zelf een prijsindicatie voor een nieuwe badkamer berekenen — tegelwerk, douche, toilet en wastafel. Ontvang alleen serieuze aanvragen. Start gratis.",
    h1: "Prijsberekening voor badkamerbedrijven, zonder losse offertes te typen",
    intro:
      "Een badkamerverbouwing roept bij klanten vaak als eerste de vraag 'wat gaat dit ongeveer kosten' op, nog voordat ze een winkel of showroom bezoeken. Met Kostenplan berekenen bezoekers zelf een prijsindicatie op basis van tegelwerk, sanitair en montage — jij ontvangt alleen aanvragen van klanten die al een beeld van het budget hebben.",
    voordelen: [
      {
        titel: "Tegelwerk per vierkante meter wand en vloer",
        tekst:
          "Reken wand- en vloertegels apart per vierkante meter door, elk met hun eigen materiaalprijs, zodat verschillende tegelkeuzes direct in de indicatie zichtbaar zijn.",
      },
      {
        titel: "Sanitair als losse bouwstenen",
        tekst:
          "Combineer douche, toilet en wastafel als losse onderdelen met elk hun eigen opties (bijvoorbeeld inloopdouche versus douchecabine), die samen de badkamer compleet maken.",
      },
      {
        titel: "Montage apart zichtbaar",
        tekst:
          "Houd installatie- en montagekosten als eigen regel zichtbaar in de uitsplitsing, zodat de klant begrijpt waar de prijs uit is opgebouwd en niet alleen een totaalbedrag ziet.",
      },
    ],
    faqs: [
      {
        vraag: "Kan ik een complete badkamer laten berekenen, of alleen tegelwerk?",
        antwoord:
          "Beide kan. Je bouwt de badkamer op uit losse onderdelen (tegelwerk, douche, toilet, wastafel, montage) die je samen of los kunt aanbieden — voor een simpele tegelwerk-rekentool laat je de andere onderdelen gewoon weg.",
      },
      {
        vraag: "Kan ik onderscheid maken tussen een inloopdouche en een douchecabine?",
        antwoord:
          "Ja. Je stelt dat in als keuzeoptie binnen het douche-onderdeel, elk met een eigen prijs, zodat de klant zelf de gewenste variant selecteert en de prijsindicatie daarop aanpast.",
      },
      {
        vraag: "Kan ik wand- en vloertegels apart prijzen?",
        antwoord:
          "Ja. Wand- en vloertegels zijn losse prijsregels, elk met hun eigen oppervlakte en materiaalprijs per vierkante meter, zodat een klant met alleen een nieuwe vloer geen wandtegelkosten in de indicatie krijgt.",
      },
    ],
  },
  {
    slug: "kozijnen",
    naam: "kozijnenbedrijf",
    naamMeervoud: "kozijnenbedrijven",
    projectVoorbeeld: "nieuwe kozijnen",
    title: "Offertecalculator voor Kozijnenbedrijven",
    description:
      "Laat klanten zelf een prijsindicatie voor nieuwe kozijnen berekenen — inclusief glas, ventilatie en montage. Ontvang alleen serieuze aanvragen. Start gratis.",
    h1: "Prijsberekening voor kozijnenbedrijven, zonder losse offertes te typen",
    intro:
      "Kozijnen vervangen is voor de meeste klanten een eenmalige, prijsgevoelige beslissing — ze willen eerst een indicatie voordat ze een adviesgesprek inplannen. Met Kostenplan berekenen bezoekers zelf een prijsindicatie op basis van afmetingen, glassoort en montage, jij ontvangt alleen aanvragen van mensen met een realistisch budget.",
    voordelen: [
      {
        titel: "Prijs per kozijn, op basis van afmetingen",
        tekst:
          "Reken per kozijn een prijs op basis van breedte en hoogte, zodat grotere kozijnen automatisch duurder worden dan kleine — precies zoals in de praktijk.",
      },
      {
        titel: "Glassoort en ventilatierooster als opties",
        tekst:
          "Laat de klant kiezen tussen glassoorten (bijvoorbeeld HR++ of triple glas) en optioneel een ventilatierooster, elk met een eigen prijstoeslag.",
      },
      {
        titel: "Montage inclusief of los",
        tekst:
          "Bepaal zelf of montage standaard is inbegrepen of als aparte regel wordt getoond, afhankelijk van hoe je dat normaal ook in je offertes verwerkt.",
      },
    ],
    faqs: [
      {
        vraag: "Kan de prijs meeschalen met de afmetingen van het kozijn?",
        antwoord:
          "Ja. De prijs wordt berekend op basis van de ingevoerde breedte en hoogte, zodat een groot kozijn automatisch een hogere prijsindicatie krijgt dan een klein kozijn van hetzelfde type.",
      },
      {
        vraag: "Kan ik verschillende glassoorten met verschillende prijzen aanbieden?",
        antwoord:
          "Ja. Je stelt glassoorten zoals HR++ en triple glas in als keuzeopties met elk een eigen prijstoeslag, zodat de klant het effect van zijn keuze direct in de indicatie ziet.",
      },
      {
        vraag: "Kan ik een ventilatierooster als optie toevoegen?",
        antwoord:
          "Ja, als aanvinkbare extra optie met een eigen prijs, die alleen wordt meegeteld wanneer de klant die optie selecteert.",
      },
    ],
  },
  {
    slug: "aannemers",
    naam: "aannemer",
    naamMeervoud: "aannemers",
    projectVoorbeeld: "een verbouwing of aanbouw",
    title: "Offertecalculator voor Aannemers",
    description:
      "Laat klanten zelf een eerste prijsindicatie voor een verbouwing of aanbouw berekenen. Ontvang alleen serieuze aanvragen in je eigen leads-CRM. Start gratis.",
    h1: "Prijsberekening voor aannemers, zonder losse offertes te typen",
    intro:
      "Als aannemer krijg je regelmatig oriënterende aanvragen van klanten die vooral willen weten of een verbouwing of aanbouw binnen hun budget past, nog voordat een bouwkundige opname zinvol is. Met Kostenplan berekenen bezoekers zelf een eerste prijsindicatie op basis van hun project — jij ontvangt alleen aanvragen van mensen die daarna nog steeds geïnteresseerd zijn.",
    voordelen: [
      {
        titel: "Grove indicatie voor grote projecten",
        tekst:
          "Bouw een rekentool die op basis van vierkante meters, bouwlagen en gewenste afwerking een eerste prijsrange geeft — genoeg om te filteren, zonder de precisie van een volledige begroting te beloven.",
      },
      {
        titel: "Meerdere projecttypen naast elkaar",
        tekst:
          "Zet losse rekentools op voor bijvoorbeeld een aanbouw, een dakkapel of een volledige verbouwing, zodat elke klant alleen de vragen ziet die bij zijn type project horen.",
      },
      {
        titel: "Duidelijk als indicatie, niet als vaste prijs",
        tekst:
          "Communiceer in de rekentool zelf dat het om een prijsindicatie gaat vooruitlopend op een opname — dat voorkomt verwarring bij klanten over wat wel en niet is inbegrepen.",
      },
    ],
    faqs: [
      {
        vraag: "Kan een rekentool een exacte bouwprijs berekenen?",
        antwoord:
          "Nee, en dat is ook niet het doel. Een rekentool geeft een eerste, grove prijsindicatie op basis van de door de klant ingevulde gegevens (bijvoorbeeld vierkante meters en gewenste afwerking) — een exacte prijs blijft afhankelijk van een bouwkundige opname en een op maat gemaakte offerte.",
      },
      {
        vraag: "Kan ik voor verschillende soorten projecten aparte rekentools maken?",
        antwoord:
          "Ja. Je kunt bijvoorbeeld een aparte rekentool maken voor een aanbouw, een dakkapel en een volledige verbouwing, elk met de vragen en prijsopbouw die bij dat type project passen.",
      },
      {
        vraag: "Helpt dit om alleen serieuze aanvragen binnen te krijgen?",
        antwoord:
          "Ja. Doordat de klant vooraf al een prijsrange ziet die past bij zijn project, filtert de rekentool automatisch een deel van de oriënterende aanvragen eruit die toch niet binnen het beschikbare budget passen.",
      },
    ],
  },
  {
    slug: "loodgieters",
    naam: "loodgieter",
    naamMeervoud: "loodgieters",
    projectVoorbeeld: "installatiewerk",
    title: "Offertecalculator voor Loodgieters",
    description:
      "Laat klanten zelf een prijsindicatie voor installatiewerk berekenen — van een cv-ketel tot sanitair. Ontvang alleen serieuze aanvragen. Start gratis.",
    h1: "Prijsberekening voor loodgieters, zonder losse offertes te typen",
    intro:
      "Als loodgieter krijg je veel uiteenlopende aanvragen — van een lekkage tot een complete badkamerinstallatie — waarvan een deel alleen wil weten \"wat kost dit ongeveer.\" Met Kostenplan berekenen bezoekers zelf een prijsindicatie voor hun installatiewerk — jij ontvangt alleen aanvragen van mensen die al weten wat het ongeveer gaat kosten.",
    voordelen: [
      {
        titel: "Prijs per meter leidingwerk of per aansluiting",
        tekst:
          "Reken leidingwerk per strekkende meter en vaste onderdelen (zoals een nieuwe cv-ketel of een sanitair-aansluiting) als apart bedrag, zodat de opbouw voor de klant herkenbaar blijft.",
      },
      {
        titel: "Spoedwerk apart geprijsd",
        tekst:
          "Voeg een toeslag toe voor spoedaanvragen of werk buiten reguliere uren, die alleen meetelt wanneer de klant aangeeft dat het dringend is.",
      },
      {
        titel: "Van vervangen ketel tot volledige installatie",
        tekst:
          "Bouw losse rekentools voor uiteenlopend werk — bijvoorbeeld één voor het vervangen van een cv-ketel en één voor het aansluiten van sanitair — elk met de vragen die daar logisch bij horen.",
      },
    ],
    faqs: [
      {
        vraag: "Kan ik een prijsindicatie geven voor het vervangen van een cv-ketel?",
        antwoord:
          "Ja. Je stelt een vaste prijs of prijs per model in, eventueel met keuzeopties voor verschillende ketelmerken of -capaciteiten, gecombineerd met een vast bedrag voor installatie.",
      },
      {
        vraag: "Kan ik leidingwerk per meter laten doorrekenen?",
        antwoord:
          "Ja. Je stelt een prijs per strekkende meter in voor leidingwerk, die automatisch meeschaalt met de lengte die de klant invult.",
      },
      {
        vraag: "Kan ik een toeslag instellen voor spoedwerk?",
        antwoord:
          "Ja, met een voorwaardelijke prijsregel gekoppeld aan een vraag als \"is dit spoedeisend?\" — de toeslag telt dan alleen mee wanneer de klant dat aangeeft.",
      },
    ],
  },
  {
    slug: "elektriciens",
    naam: "elektricien",
    naamMeervoud: "elektriciens",
    projectVoorbeeld: "elektrawerk",
    title: "Offertecalculator voor Elektriciens",
    description:
      "Laat klanten zelf een prijsindicatie voor elektrawerk berekenen — van een groepenkast tot een laadpaal. Ontvang alleen serieuze aanvragen. Start gratis.",
    h1: "Prijsberekening voor elektriciens, zonder losse offertes te typen",
    intro:
      "Als elektricien krijg je aanvragen die sterk in omvang verschillen — van één extra wandcontactdoos tot een volledig vernieuwde groepenkast of een laadpaal. Met Kostenplan berekenen bezoekers zelf een prijsindicatie voor hun elektrawerk — jij ontvangt alleen aanvragen van mensen die al weten wat het ongeveer gaat kosten.",
    voordelen: [
      {
        titel: "Prijs per aansluitpunt of onderdeel",
        tekst:
          "Reken een vast bedrag per extra wandcontactdoos, schakelaar of lichtpunt, en een apart bedrag voor grotere onderdelen zoals een nieuwe groepenkast of een laadpaal-aansluiting.",
      },
      {
        titel: "Aantal groepen of punten laten meetellen",
        tekst:
          "Laat de klant het gewenste aantal aansluitpunten invullen; de rekentool telt automatisch de bijbehorende prijs op bij de rest van de berekening.",
      },
      {
        titel: "Keuzeopties voor materiaalkwaliteit",
        tekst:
          "Bied bijvoorbeeld een standaard- en een merkschakelaar aan als keuzeopties, elk met een eigen prijs, zodat de klant zelf de gewenste kwaliteit selecteert.",
      },
    ],
    faqs: [
      {
        vraag: "Kan ik een prijsindicatie geven voor een laadpaal-aansluiting?",
        antwoord:
          "Ja. Je stelt een vast bedrag of een prijs op basis van de afstand tot de meterkast in, eventueel gecombineerd met keuzeopties voor het gewenste type laadpaal.",
      },
      {
        vraag: "Kan ik rekenen per aantal wandcontactdozen of lichtpunten?",
        antwoord:
          "Ja. Je stelt een prijs per stuk in en laat de klant het gewenste aantal invullen — de rekentool vermenigvuldigt dat automatisch tot de juiste deelprijs.",
      },
      {
        vraag: "Kan ik onderscheid maken tussen kleine klussen en een volledige groepenkast-vervanging?",
        antwoord:
          "Ja, door losse rekentools te maken per type werk, of door binnen één rekentool een vraag toe te voegen die bepaalt welke vervolgvragen en prijsregels van toepassing zijn.",
      },
    ],
  },
];

export function getDoelgroep(slug: string): Doelgroep | undefined {
  return DOELGROEPEN.find((d) => d.slug === slug);
}
