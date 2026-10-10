# Gewijzigde teksten (fase 4)

Oud → nieuw, per bestand. Alleen wat een gebruiker leest is aangepast; interne code- en databasenamen (Product, `/producten`, enz.) zijn niet hernoemd. De teksten van de nieuwe wizard en onboarding (fase 2 en 3) zijn nieuw geschreven en staan hier niet als oud → nieuw.

Niet gewijzigd: e-mails en Brevo-templates (staan niet in deze repo; nog niets aangeleverd).


## `app/algemene-voorwaarden/page.tsx`

- **oud:** "Lees de algemene voorwaarden van Kostenplan, de offertecalculator voor hoveniers en andere vakmensen.",
  **nieuw:** "Lees de algemene voorwaarden van Kostenplan, de rekentool voor hoveniers.",
- **oud:** vakmensen prijsindicaties kunnen geven aan hun potentiële klanten. Kostenplan
  **nieuw:** hoveniers prijsindicaties kunnen geven aan hun potentiële klanten. Kostenplan
- **oud:** het gebruik van de tool tussen de gebruiker (de vakman) en diens eindklant.
  **nieuw:** het gebruik van de tool tussen de gebruiker (de hovenier) en diens eindklant.

## `app/api/search-index/route.ts`

- **oud:** type: "Voor vakmensen",
  **nieuw:** type: "Voor hoveniers",

## `app/blog/page.tsx`

- **oud:** "Verhalen, inzichten en updates over rekentools, offertes en het werk van vakmensen.";
  **nieuw:** "Verhalen, inzichten en updates over rekentools, offertes en het werk van hoveniers.";

## `app/components/dashboard/cancel-retention-modal.tsx`

- **oud:** "Onbeperkt producten — terug naar maximaal 10",
  **nieuw:** "Onbeperkt aantal werkzaamheden — terug naar maximaal 10",
- **oud:** Of downgrade naar Plus — je behoudt onbeperkt producten, je huisstijl en
  **nieuw:** Of downgrade naar Plus — je behoudt een onbeperkt aantal werkzaamheden, je huisstijl en

## `app/components/dashboard/nieuw-item-button.tsx`

- **oud:** description={`Het Gratis-pakket biedt plek voor maximaal ${GRATIS_CATALOGUS_LIMIET} producten. Upgrade naar Plus of Pro voor onbeperkt producten.`}
  **nieuw:** description={`Het Gratis-pakket biedt plek voor maximaal ${GRATIS_CATALOGUS_LIMIET} werkzaamheden. Upgrade naar Plus of Pro voor een onbeperkt aantal werkzaamheden.`}

## `app/components/marketing/doelgroep-landing.tsx`

- **oud:** { label: "Voor vakmensen", href: "/voor" },
  **nieuw:** { label: "Voor hoveniers", href: "/voor/hoveniers" },
- **oud:** <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
  **nieuw:** {andereDoelgroepen.length > 0 && <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
- **oud:** Voeg je 10 populairste producten toe en deel je rekentool direct
  **nieuw:** Zet je populairste werkzaamheden klaar en deel je rekentool direct

## `app/components/marketing/faq-section.tsx`

- **oud:** "Ja. Je kiest een sjabloon voor jouw vakgebied of begint helemaal vanaf 0, en stelt daarna via een visuele bouwer je eigen vragen, prijzen en voorwaarden in — zonder code of technische kennis.",
  **nieuw:** "Ja. Je vinkt aan welke werkzaamheden je doet, zoals schutting of bestrating, of begint helemaal vanaf 0, en stelt daarna via een visuele bouwer je eigen vragen, prijzen en voorwaarden in — zonder code of technische kennis.",
- **oud:** "Na het aanmaken van je account stel je eenmalig je kosteninstellingen in (uurtarief, voorrijkosten, materiaalmarge en btw). Daarna voeg je je eigen producten met hun prijzen toe. De rekentool berekent automatisch een prijsindicatie op basis van jouw tarieven …
  **nieuw:** "Na het aanmaken van je account stel je eenmalig je kosteninstellingen in (uurtarief, voorrijkosten, materiaalmarge en btw). Daarna loop je de voorbeeldprijzen van je werkzaamheden na en pas je ze aan. De rekentool berekent automatisch een prijsindicatie op ba…
- **oud:** "Je gebruikt Kostenplan volledig gratis met tot 10 producten, zonder tijdslimiet en zonder creditcard. Wil je onbeperkt producten, je eigen huisstijl of het leads-overzicht? Dan upgrade je naar Plus of Pro.",
  **nieuw:** "Je gebruikt Kostenplan volledig gratis met tot 10 werkzaamheden, zonder tijdslimiet en zonder creditcard. Wil je een onbeperkt aantal werkzaamheden, je eigen huisstijl of het leads-overzicht? Dan upgrade je naar Plus of Pro.",

## `app/components/marketing/nav-links.ts`

- **oud:** { href: "/voor", label: "Voor vakmensen", breakpoint: "md:inline-flex" },
  **nieuw:** { href: "/voor/hoveniers", label: "Voor hoveniers", breakpoint: "md:inline-flex" },

## `app/components/marketing/site-footer.tsx`

- **oud:** { href: "/voor", label: "Alle vakgebieden" },
  **nieuw:** _(verwijderd)_
- **oud:** <FooterColumn title="Voor wie" links={doelgroepLinks} />
  **nieuw:** <FooterColumn title="Voor hoveniers" links={doelgroepLinks} />

## `app/components/marketing/structured-data.tsx`

- **oud:** "Platform waarmee vakmensen een online rekentool voor hun website bouwen: klanten berekenen zelf een prijsindicatie, aanvragen komen binnen in een leads-CRM.",
  **nieuw:** "Platform waarmee hoveniers een online rekentool voor hun website bouwen: klanten berekenen zelf een prijsindicatie, aanvragen komen binnen in een leads-CRM.",
- **oud:** description: "Gratis pakket met tot 10 producten",
  **nieuw:** description: "Gratis pakket met tot 10 werkzaamheden",

## `app/components/marketing/use-case-switcher.tsx`

- **oud:** bedrijfsnaam: "Van Dijk Kozijnen", ⏎ productTitel: "Bereken je nieuwe kozijnen",
  **nieuw:** bedrijfsnaam: "Tuinbestrating Plus", ⏎ productTitel: "Bereken de kosten van je terras",
- **oud:** { label: "Aantal kozijnen", waarde: "6" },
  **nieuw:** { label: "Type tegel", waarde: "Keramisch" },
- **oud:** bedrijfsnaam: "Van der Berg Bouw", ⏎ productTitel: "Bereken je verbouwing",
  **nieuw:** bedrijfsnaam: "Kunstgras Voordeel", ⏎ productTitel: "Bereken je kunstgras",
- **oud:** { label: "Type verbouwing", waarde: "Aanbouw" },
  **nieuw:** _(verwijderd)_
- **oud:** <div className="flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Voorbeeld per vakgebied">
  **nieuw:** <div className="flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Voorbeeld per werkzaamheid">

## `app/components/pricing/pricing-table.tsx`

- **oud:** "Onbeperkt producten",
  **nieuw:** "Onbeperkt aantal werkzaamheden",

## `app/dashboard/bedrijven/nieuw/company-form.tsx`

- **oud:** <Input id="naam" name="naam" placeholder="Bijv. Jansen Klussenbedrijf" required autoFocus />
  **nieuw:** <Input id="naam" name="naam" placeholder="Bijv. Jansen Hoveniersbedrijf" required autoFocus />

## `app/dashboard/bedrijven/nieuw/page.tsx`

- **oud:** Een nieuw bedrijf start met een lege catalogus en het Gratis-pakket. Je kunt daarna ⏎ producten en instellingen opbouwen zoals bij een nieuw account.
  **nieuw:** Een nieuw bedrijf start met een lege lijst werkzaamheden en het Gratis-pakket. Je kunt daarna ⏎ werkzaamheden en instellingen opbouwen zoals bij een nieuw account.

## `app/dashboard/page.tsx`

- **oud:** Dit is jouw Kostenplan-dashboard. Beheer je rekentools en deel ze met klanten.
  **nieuw:** Dit is jouw Kostenplan-dashboard. Beheer je rekentool en deel hem met je klanten.
- **oud:** <StatCard icon={Package} label="Producten (alle tools)" value={productsCount} href="/dashboard/tools" />
  **nieuw:** <StatCard icon={Package} label="Werkzaamheden (alle rekentools)" value={productsCount} href="/dashboard/tools" />
- **oud:** Elke rekentool heeft zijn eigen producten, prijzen, huisstijl en publieke link — beheer ze
  **nieuw:** Elke rekentool heeft zijn eigen werkzaamheden, prijzen, huisstijl en publieke link — beheer ze

## `app/dashboard/profiel/company-card.tsx`

- **oud:** Dit verwijdert <strong>{company.naam}</strong> definitief, inclusief alle producten,
  **nieuw:** Dit verwijdert <strong>{company.naam}</strong> definitief, inclusief alle werkzaamheden,

## `app/dashboard/tools/[toolId]/bouwer/calculator-bouwer.tsx`

- **oud:** Schakelt de publieke rekentool terug naar de vorige, sjabloon-gedreven editor (Producten/Prijzen/enz.). Je
  **nieuw:** Schakelt de publieke rekentool terug naar de vorige, sjabloon-gedreven editor (Werkzaamheden/Prijzen/enz.). Je
- **oud:** description="De publieke rekentool toont hierna weer de sjabloon-gedreven calculator (Producten/Prijzen). Je bouwer-configuratie blijft bewaard."
  **nieuw:** description="De publieke rekentool toont hierna weer de sjabloon-gedreven calculator (Werkzaamheden/Prijzen). Je bouwer-configuratie blijft bewaard."

## `app/dashboard/tools/[toolId]/bouwer/onderdelen-bouwer.tsx`

- **oud:** Schakelt de publieke rekentool terug naar de vorige, sjabloon-gedreven editor (Producten/Prijzen/enz.). Je
  **nieuw:** Schakelt de publieke rekentool terug naar de vorige, sjabloon-gedreven editor (Werkzaamheden/Prijzen/enz.). Je
- **oud:** description="De publieke rekentool toont hierna weer de sjabloon-gedreven calculator (Producten/Prijzen). Je Onderdelen-configuratie blijft bewaard."
  **nieuw:** description="De publieke rekentool toont hierna weer de sjabloon-gedreven calculator (Werkzaamheden/Prijzen). Je Onderdelen-configuratie blijft bewaard."

## `app/dashboard/tools/[toolId]/bouwer/page.tsx`

- **oud:** <p className="font-medium text-foreground">Deze rekentool is opgebouwd met Producten</p>
  **nieuw:** <p className="font-medium text-foreground">Deze rekentool is opgebouwd met Werkzaamheden</p>
- **oud:** vragen en berekeningen beheer je hier via Producten. Er is dus niets om hier in te
  **nieuw:** vragen en berekeningen beheer je hier via Werkzaamheden. Er is dus niets om hier in te
- **oud:** Naar Producten
  **nieuw:** Naar Werkzaamheden

## `app/dashboard/tools/[toolId]/instellingen/danger-zone.tsx`

- **oud:** Maakt een kopie van deze tool (producten, prijzen, huisstijl en instellingen) als nieuw
  **nieuw:** Maakt een kopie van deze tool (werkzaamheden, prijzen, huisstijl en instellingen) als nieuw

## `app/dashboard/tools/[toolId]/page.tsx`

- **oud:** { segment: "producten", label: "Producten", icon: Package, beschrijving: "Wat je klant kan kiezen" },
  **nieuw:** { segment: "producten", label: "Werkzaamheden", icon: Package, beschrijving: "Wat je klant kan kiezen" },
- **oud:** <StatCard label="Producten" value={productenCount} />
  **nieuw:** <StatCard label="Werkzaamheden" value={productenCount} />

## `app/dashboard/tools/[toolId]/prijzen/cost-settings-form.tsx`

- **oud:** description="De standaardtarieven voor arbeidstijd van producten in deze tool."
  **nieuw:** description="De standaardtarieven voor arbeidstijd van je werkzaamheden in deze rekentool."
- **oud:** Nieuwe producten gebruiken standaard dit tarief. Vul voor de zekerheid alle drie de ⏎ tarieven in — een product kan altijd in een andere eenheid rekenen dan hierboven gekozen.
  **nieuw:** Nieuwe werkzaamheden gebruiken standaard dit tarief. Vul voor de zekerheid alle drie de ⏎ tarieven in — een werkzaamheid kan altijd in een andere eenheid rekenen dan hierboven gekozen.
- **oud:** ). Zet dit aan om per product altijd naar boven af te ronden op hele{" "}
  **nieuw:** ). Zet dit aan om per werkzaamheid altijd naar boven af te ronden op hele{" "}
- **oud:** Geldt voor {geraaktDoorArbeid} van de {productCounts.totaal} producten — de rest heeft een
  **nieuw:** Geldt voor {geraaktDoorArbeid} van de {productCounts.totaal} werkzaamheden — de rest heeft een
- **oud:** Wijkt het bij een product af (bijv. zware materialen die apart vervoerd moeten worden)? ⏎ Stel dat per product in bij het bewerken van dat product.
  **nieuw:** Wijkt het bij een werkzaamheid af (bijv. zware stenen die apart vervoerd moeten worden)? ⏎ Stel dat per werkzaamheid in bij het bewerken ervan.
- **oud:** Geldt voor {geraaktDoorTransport} van de {productCounts.totaal} producten — de rest heeft
  **nieuw:** Geldt voor {geraaktDoorTransport} van de {productCounts.totaal} werkzaamheden — de rest heeft
- **oud:** Wijkt het bij een product af? Stel dat per product in bij het bewerken van dat product.
  **nieuw:** Wijkt het bij een werkzaamheid af? Stel dat per werkzaamheid in bij het bewerken ervan.
- **oud:** Geldt voor {geraaktDoorVoorrij} van de {productCounts.totaal} producten — de rest heeft
  **nieuw:** Geldt voor {geraaktDoorVoorrij} van de {productCounts.totaal} werkzaamheden — de rest heeft
- **oud:** description="Kosten van de materialen die je bij een product instelt."
  **nieuw:** description="Kosten van de materialen die je bij een werkzaamheid instelt."
- **oud:** De prijs per materiaal stel je in bij het product zelf — dat is al de volledige prijs die
  **nieuw:** De prijs per materiaal stel je in bij de werkzaamheid zelf — dat is al de volledige prijs die
- **oud:** <option value="PER_PRODUCT">Per product — optellen van min/max-prijzen</option>
  **nieuw:** <option value="PER_PRODUCT">Per werkzaamheid — optellen van min/max-prijzen</option>
- **oud:** Producten met een bandbreedte-prijs (in te stellen bij het product zelf) tellen mee
  **nieuw:** Werkzaamheden met een bandbreedte-prijs (in te stellen bij de werkzaamheid zelf) tellen mee

## `app/dashboard/tools/[toolId]/producten/[id]/bewerken/extra-options-manager.tsx`

- **oud:** van dit product (per {unitLabel(productEenheid)}) of dat de klant er zelf een apart
  **nieuw:** van deze werkzaamheid (per {unitLabel(productEenheid)}) of dat de klant er zelf een apart

## `app/dashboard/tools/[toolId]/producten/[id]/bewerken/material-categories-manager.tsx`

- **oud:** Onderdelen van dit product waarvoor de klant één materiaal kiest, bijv.
  **nieuw:** Onderdelen van deze werkzaamheid waarvoor de klant één materiaal kiest, bijv.

## `app/dashboard/tools/[toolId]/producten/[id]/bewerken/page.tsx`

- **oud:** Product bewerken
  **nieuw:** Werkzaamheid bewerken
- **oud:** <p className="mt-1 text-muted-foreground">Werk de gegevens van dit product bij.</p>
  **nieuw:** <p className="mt-1 text-muted-foreground">Pas je prijzen en materialen aan. Alles wordt vanzelf opgeslagen.</p>

## `app/dashboard/tools/[toolId]/producten/page.tsx`

- **oud:** Samengestelde producten met materiaalkeuzes, bijv. een schutting met palen en
  **nieuw:** Wat je klant kan laten berekenen, met materiaalkeuzes, bijv. een schutting met palen en
- **oud:** <NieuwItemButton href={`/dashboard/tools/${toolId}/producten/nieuw`} label="Nieuw product" atLimit={atLimit} />
  **nieuw:** <NieuwItemButton href={`/dashboard/tools/${toolId}/producten/nieuw`} label="Nieuwe werkzaamheid" atLimit={atLimit} />
- **oud:** <p className="font-medium text-foreground">Nog geen producten</p>
  **nieuw:** <p className="font-medium text-foreground">Nog geen werkzaamheden</p>
- **oud:** Voeg een product toe en richt daarna de materiaalcategorieën en extra opties in.
  **nieuw:** Kies een werkzaamheid zoals schutting of bestrating; de prijzen vul je zelf in.
- **oud:** label="Nieuw product"
  **nieuw:** label="Nieuwe werkzaamheid"

## `app/dashboard/tools/[toolId]/producten/product-form.tsx`

- **oud:** aria-label="Secties in dit product"
  **nieuw:** aria-label="Secties in deze werkzaamheid"
- **oud:** _(nieuw)_
  **nieuw:** placeholder="Bijv. Terras aanleggen"
- **oud:** De hoeveelheid die de klant opgeeft, bijv. m² beplanting of uur timmerwerk.
  **nieuw:** De hoeveelheid die de klant opgeeft, bijv. m² bestrating of strekkende meter haag.
- **oud:** Laat leeg als dit product geen arbeidstijd kost.
  **nieuw:** Laat leeg als dit werk geen arbeidstijd kost.

## `app/dashboard/tools/[toolId]/producten/producten-table.tsx`

- **oud:** placeholder="Zoek een product…" ⏎ aria-label="Zoek in producten"
  **nieuw:** placeholder="Zoek een werkzaamheid…" ⏎ aria-label="Zoek in werkzaamheden"
- **oud:** <SorteerbareKolom label="Product" kolom="naam" sortering={sortering} onClick={wisselSortering} />
  **nieuw:** <SorteerbareKolom label="Werkzaamheid" kolom="naam" sortering={sortering} onClick={wisselSortering} />
- **oud:** <DeleteButton action={deleteProductAction} id={product.id} idField="productId" confirmMessage="Weet je zeker dat je dit product wilt verwijderen?" />
  **nieuw:** <DeleteButton action={deleteProductAction} id={product.id} idField="productId" confirmMessage="Weet je zeker dat je deze werkzaamheid wilt verwijderen?" />
- **oud:** Geen producten gevonden voor &ldquo;{zoek}&rdquo;.
  **nieuw:** Geen werkzaamheden gevonden voor &ldquo;{zoek}&rdquo;.
- **oud:** <DeleteButton action={deleteProductAction} id={product.id} idField="productId" confirmMessage="Weet je zeker dat je dit product wilt verwijderen?" />
  **nieuw:** <DeleteButton action={deleteProductAction} id={product.id} idField="productId" confirmMessage="Weet je zeker dat je deze werkzaamheid wilt verwijderen?" />

## `app/dashboard/tools/[toolId]/producten/velden/kosten-blok.tsx`

- **oud:** {titel} wijkt af voor dit product
  **nieuw:** {titel} wijkt af voor deze werkzaamheid
- **oud:** <>Dit product gebruikt vanaf nu een eigen bedrag in plaats van de standaard van {standaardTekst}.</>
  **nieuw:** <>Deze werkzaamheid gebruikt vanaf nu een eigen bedrag in plaats van de standaard van {standaardTekst}.</>
- **oud:** {naam || "Dit product"} van {hoeveelheid} {unitLabel(eenheid)}
  **nieuw:** {naam || "Deze werkzaamheid"} van {hoeveelheid} {unitLabel(eenheid)}

## `app/dashboard/tools/page.tsx`

- **oud:** Elke rekentool heeft zijn eigen producten, prijzen, huisstijl en publieke link.
  **nieuw:** Elke rekentool heeft zijn eigen werkzaamheden, prijzen, huisstijl en publieke link.

## `app/layout.tsx`

- **oud:** default: "Kostenplan — Offertecalculator voor vakmensen",
  **nieuw:** default: "Kostenplan — Rekentool voor hoveniers",
- **oud:** "Kostenplan helpt vakmensen een online kostencalculator te bouwen zodat klanten direct een duidelijke schatting krijgen van de kosten van hun project.",
  **nieuw:** "Kostenplan helpt hoveniers een online kostencalculator te bouwen zodat klanten direct een duidelijke schatting krijgen van de kosten van hun project.",

## `app/lib/actions/extra-options.ts`

- **oud:** return { error: "Product niet gevonden" };
  **nieuw:** return { error: "Werkzaamheid niet gevonden" };

## `app/lib/actions/material-categories.ts`

- **oud:** return { error: "Product niet gevonden" };
  **nieuw:** return { error: "Werkzaamheid niet gevonden" };

## `app/lib/actions/products.ts`

- **oud:** error: `Je hebt de limiet van ${PLAN_LIMITS.GRATIS.maxProductsPerCompany} producten (over al je rekentools heen) voor het Gratis-pakket bereikt. Upgrade naar Plus of Pro voor onbeperkt producten.`,
  **nieuw:** error: `Je hebt de limiet van ${PLAN_LIMITS.GRATIS.maxProductsPerCompany} werkzaamheden (over al je rekentools heen) voor het Gratis-pakket bereikt. Upgrade naar Plus of Pro voor een onbeperkt aantal werkzaamheden.`,

## `app/lib/helpContent.ts`

- **oud:** title: "Opbouw van een product",
  **nieuw:** title: "Opbouw van een werkzaamheid",
- **oud:** "De prijs van een product wordt berekend uit vier blokken: materiaalkosten, arbeidskosten, transportkosten en voorrijkosten. Je vult per blok in wat je normaal rekent — de rekentool telt dit automatisch bij elkaar op tot een totaalprijs voor de klant.",
  **nieuw:** "De prijs van een werkzaamheid wordt berekend uit vier blokken: materiaalkosten, arbeidskosten, transportkosten en voorrijkosten. Je vult per blok in wat je normaal rekent — de rekentool telt dit automatisch bij elkaar op tot een totaalprijs voor de klant.",
- **oud:** "Met bandbreedte toon je een minimum- en maximumprijs in plaats van één vast bedrag. Handig als de kostprijs van een materiaal kan variëren.",
  **nieuw:** "Met bandbreedte toon je een minimum- en maximumprijs in plaats van één vast bedrag. Handig als de prijs van een materiaal, zoals tegels of hout, kan variëren.",
- **oud:** "“Per eenheid” schaalt automatisch mee met de hoeveelheid van het product. “Per stuk” heeft een eigen, los aantal dat de klant apart invult.",
  **nieuw:** "“Per eenheid” schaalt automatisch mee met de hoeveelheid van de werkzaamheid. “Per stuk” heeft een eigen, los aantal dat de klant apart invult.",
- **oud:** "Het percentage dat wordt opgeteld bovenop je totaalprijs. Dit geldt voor alle producten in je rekentool.",
  **nieuw:** "Het percentage dat wordt opgeteld bovenop je totaalprijs. Dit geldt voor alle werkzaamheden in je rekentool.",
- **oud:** "Je kunt meerdere bedrijven beheren met één account. Wissel tussen bedrijven via de bedrijvenknop bovenin — elk bedrijf heeft zijn eigen producten, branding en instellingen.",
  **nieuw:** "Je kunt meerdere bedrijven beheren met één account. Wissel tussen bedrijven via de bedrijvenknop bovenin — elk bedrijf heeft zijn eigen werkzaamheden, branding en instellingen.",
- **oud:** "Klik hier om te wisselen tussen de bedrijven die aan jouw account gekoppeld zijn. Elk bedrijf heeft zijn eigen producten, branding en instellingen.",
  **nieuw:** "Klik hier om te wisselen tussen de bedrijven die aan jouw account gekoppeld zijn. Elk bedrijf heeft zijn eigen werkzaamheden, branding en instellingen.",

## `app/lib/onboarding.ts`

- **oud:** beschrijving: "Geef 'm een naam — je richt de rest zo in.",
  **nieuw:** beschrijving: "Geef je rekentool een naam — je richt de rest zo in.",
- **oud:** titel: "Voeg je eerste product toe", ⏎ beschrijving: "Zo kunnen klanten direct een prijsindicatie berekenen.",
  **nieuw:** titel: "Zet je eerste werkzaamheid klaar", ⏎ beschrijving: "Bijvoorbeeld een schutting of bestrating — zo kunnen klanten direct een prijsindicatie berekenen.",

## `app/lib/sjablonen.ts`

- **oud:** voorbeeldenTekst: "timmerwerk, snoeiwerk — alles met een vaste eenheidsprijs",
  **nieuw:** voorbeeldenTekst: "haag, graszoden, tuinonderhoud — alles met een vaste prijs per eenheid",
- **oud:** _(nieuw)_
  **nieuw:** voorbeeldenTekst: "meerdere tuinzones of vakken, elk apart gemeten",
- **oud:** _(nieuw)_
  **nieuw:** voorbeeldenTekst: "poorten, tuinhuisjes, lichtpunten — per stuk geprijsd",

## `app/lib/validation.ts`

- **oud:** regels: z.array(leadSnapshotLineSchema).min(1, "Selecteer minimaal één product"),
  **nieuw:** regels: z.array(leadSnapshotLineSchema).min(1, "Selecteer minimaal één werkzaamheid"),

## `app/offerte-calculator/page.tsx`

- **oud:** { aspect: "Wie vult hem in", programma: "De vakman zelf, achter de schermen", calculator: "De klant, op de website van de vakman" },
  **nieuw:** { aspect: "Wie vult hem in", programma: "De hovenier zelf, achter de schermen", calculator: "De klant, op de website van de hovenier" },
- **oud:** "Een offerte calculator is een rekentool op de website van een vakman waarmee een bezoeker eerst zelf een prijsindicatie berekent, en vervolgens — als die indicatie past bij zijn budget — via dezelfde tool direct een offerte kan aanvragen. De aanvraag komt aan…
  **nieuw:** "Een offerte calculator is een rekentool op de website van een hovenier waarmee een bezoeker eerst zelf een prijsindicatie berekent, en vervolgens — als die indicatie past bij zijn budget — via dezelfde tool direct een offerte kan aanvragen. De aanvraag komt a…
- **oud:** vraag: "Kan ik verschillende producten en prijzen instellen?",
  **nieuw:** vraag: "Kan ik verschillende werkzaamheden en prijzen instellen?",
- **oud:** "Ja. Je kunt meerdere producten of onderdelen combineren binnen één rekentool — bijvoorbeeld bestrating, een schutting en kunstgras samen in een tuinaanleg-calculator — elk met een eigen prijsopbouw op basis van jouw tarieven.",
  **nieuw:** "Ja. Je kunt meerdere werkzaamheden combineren binnen één rekentool — bijvoorbeeld bestrating, een schutting en kunstgras samen in een tuinaanleg-calculator — elk met een eigen prijsopbouw op basis van jouw tarieven.",
- **oud:** offerteprogramma, waarmee een vakman zelf, achter de schermen, een offerte
  **nieuw:** offerteprogramma, waarmee een hovenier zelf, achter de schermen, een offerte

## `app/onboarding/bedrijf/page.tsx`

- **oud:** <CardDescription>Nog één stap: maak je eerste bedrijf aan om te starten.</CardDescription>
  **nieuw:** <CardDescription>Maak je bedrijf aan. Binnen 2 minuten staat je rekentool klaar.</CardDescription>

## `app/onboarding/rekentool/page.tsx`

- **oud:** Een rekentool is wat je klant invult om een prijsindicatie te krijgen. Je kunt er
  **nieuw:** Een rekentool is wat je klant invult om een prijsindicatie voor zijn tuin te krijgen. Je kunt er

## `app/online-offerte-maken/page.tsx`

- **oud:** "Ja. Via de persoonlijke offertelink kan de klant de offerte digitaal accepteren of afwijzen. De status daarvan is voor de vakman direct zichtbaar in het leads-overzicht, zonder dat daar een telefoontje of e-mail voor nodig is.",
  **nieuw:** "Ja. Via de persoonlijke offertelink kan de klant de offerte digitaal accepteren of afwijzen. De status daarvan is voor de hovenier direct zichtbaar in het leads-overzicht, zonder dat daar een telefoontje of e-mail voor nodig is.",

## `app/opengraph-image.tsx`

- **oud:** Offertecalculator voor hoveniers en vakmensen
  **nieuw:** Rekentool voor hoveniers

## `app/page.tsx`

- **oud:** { label: "Andere diensten", href: "/voor" },
  **nieuw:** _(verwijderd)_
- **oud:** Kostenplan is een platform waarmee vakmensen zelf een online rekentool voor
  **nieuw:** Kostenplan is een platform waarmee hoveniers zelf een online rekentool voor
- **oud:** <span className="mr-1 text-sm font-medium text-muted-foreground">Rekentools voor:</span>
  **nieuw:** <span className="mr-1 text-sm font-medium text-muted-foreground">Rekentool voor al je werkzaamheden:</span>
- **oud:** titel="Kies een sjabloon" ⏎ tekst="Begin met een bestaande rekentool voor jouw vakgebied of maak er zelf één vanaf nul."
  **nieuw:** titel="Kies je werkzaamheden" ⏎ tekst="Vink aan wat je doet, zoals schutting, bestrating of kunstgras. Je rekentool staat in 2 minuten klaar."
- **oud:** tekst="Voeg je eigen producten, prijzen, vragen en berekeningen toe."
  **nieuw:** tekst="Pas materialen, prijzen en hoe snel je werkt aan naar jouw tarieven."
- **oud:** Eén platform. Ontelbaar veel rekentools.
  **nieuw:** Eén rekentool voor al je tuinwerk.
- **oud:** door de vakgebieden heen.
  **nieuw:** door de voorbeelden heen.

## `app/portaal/[slug]/calculator.tsx`

- **oud:** "Geef bij producten de gewenste hoeveelheid op. Je ziet direct een schatting van de kosten hiernaast."}
  **nieuw:** "Geef bij de werkzaamheden de gewenste hoeveelheid op. Je ziet direct een schatting van de kosten hiernaast."}
- **oud:** Selecteer producten om een schatting te zien.
  **nieuw:** Kies een werkzaamheid om een schatting te zien.
- **oud:** Kies bij elk product een verplicht materiaal om een volledige prijsindicatie te
  **nieuw:** Kies bij elke werkzaamheid een verplicht materiaal om een volledige prijsindicatie te

## `app/prijs-calculator/page.tsx`

- **oud:** "Ja. Zodra een bezoeker de vragen in de rekentool heeft beantwoord, verschijnt de prijsindicatie direct op het scherm, nog vóórdat er enig contact met de vakman is geweest.",
  **nieuw:** "Ja. Zodra een bezoeker de vragen in de rekentool heeft beantwoord, verschijnt de prijsindicatie direct op het scherm, nog vóórdat er enig contact met de hovenier is geweest.",
- **oud:** "Ja. Een rekentool kan uit meerdere onderdelen bestaan die samen tot één totaalprijs worden opgeteld — bijvoorbeeld bestrating, een schutting en kunstgras samen in één tuinaanleg-berekening, of een compleet keukenblok met werkblad en apparatuur in één keukenbe…
  **nieuw:** "Ja. Een rekentool kan uit meerdere onderdelen bestaan die samen tot één totaalprijs worden opgeteld — bijvoorbeeld bestrating, een schutting en kunstgras samen in één tuinaanleg-berekening.",
- **oud:** "Nee. Een prijsindicatie is een schatting op basis van de door de klant ingevulde gegevens. Een bindende offerte volgt pas na beoordeling door de vakman zelf, eventueel na een opname ter plaatse — de rekentool versnelt en filtert dat traject, maar vervangt nie…
  **nieuw:** "Nee. Een prijsindicatie is een schatting op basis van de door de klant ingevulde gegevens. Een bindende offerte volgt pas na beoordeling door de hovenier zelf, eventueel na een opname ter plaatse — de rekentool versnelt en filtert dat traject, maar vervangt n…
- **oud:** vakman vooraf heeft ingesteld — niemand hoeft dit met de hand na te rekenen.
  **nieuw:** hovenier vooraf heeft ingesteld — niemand hoeft dit met de hand na te rekenen.
- **oud:** "Een lijst van de producten of onderdelen die je aanbiedt, met hun prijs of prijs per eenheid.",
  **nieuw:** "Een lijst van de werkzaamheden die je aanbiedt, met hun prijs of prijs per eenheid.",
- **oud:** live — je kunt hem daarna altijd uitbreiden met meer producten, onderdelen of
  **nieuw:** live — je kunt hem daarna altijd uitbreiden met meer werkzaamheden of
- **oud:** intro="Wat klanten precies zien, en wat jij als vakman zelf blijft bepalen."
  **nieuw:** intro="Wat klanten precies zien, en wat jij als hovenier zelf blijft bepalen."
- **oud:** Gratis starten met tot 10 producten. Binnen 5 minuten online.
  **nieuw:** Gratis starten met tot 10 werkzaamheden. Binnen 5 minuten online.

## `app/prijzen/page.tsx`

- **oud:** title: "Prijzen voor Hoveniers en Vakmensen",
  **nieuw:** title: "Prijzen voor Hoveniers",
- **oud:** "Bekijk de prijzen van Kostenplan: gratis starten met tot 10 producten, of upgrade naar Plus of Pro voor onbeperkt gebruik en een leads-CRM.",
  **nieuw:** "Bekijk de prijzen van Kostenplan: gratis starten met tot 10 werkzaamheden, of upgrade naar Plus of Pro voor onbeperkt gebruik en een leads-CRM.",
- **oud:** title: "Prijzen voor Hoveniers en Vakmensen · Kostenplan",
  **nieuw:** title: "Prijzen voor Hoveniers · Kostenplan",
- **oud:** "Gratis starten met tot 10 producten, of upgrade naar Plus of Pro voor onbeperkt gebruik en een leads-CRM.",
  **nieuw:** "Gratis starten met tot 10 werkzaamheden, of upgrade naar Plus of Pro voor onbeperkt gebruik en een leads-CRM.",
- **oud:** title: "Prijzen voor Hoveniers en Vakmensen · Kostenplan",
  **nieuw:** title: "Prijzen voor Hoveniers · Kostenplan",
- **oud:** "Gratis starten met tot 10 producten, of upgrade naar Plus of Pro voor onbeperkt gebruik en een leads-CRM.",
  **nieuw:** "Gratis starten met tot 10 werkzaamheden, of upgrade naar Plus of Pro voor onbeperkt gebruik en een leads-CRM.",

## `app/rekentool-op-eigen-website/page.tsx`

- **oud:** Benieuwd wat een rekentool voor jouw vakgebied concreet oplevert?{" "}
  **nieuw:** Benieuwd wat een rekentool voor jouw tuinwerk concreet oplevert?{" "}
- **oud:** Gratis starten met tot 10 producten, geen creditcard nodig.
  **nieuw:** Gratis starten met tot 10 werkzaamheden, geen creditcard nodig.

## `app/rekentool-templates/page.tsx`

- **oud:** "Bekijk de kant-en-klare rekentool templates in Kostenplan, per vakgebied — van tuinaanleg tot kozijnen. Pas een sjabloon aan met je eigen prijzen en zet 'm op je website.";
  **nieuw:** "Bekijk de kant-en-klare rekentool templates in Kostenplan, voor hoveniers — van tuinaanleg tot schutting en bestrating. Pas een sjabloon aan met je eigen prijzen en zet 'm op je website.";
- **oud:** Kostenplan levert kant-en-klare rekentool templates per vakgebied — elke
  **nieuw:** Kostenplan levert kant-en-klare rekentool templates voor hoveniers — elke
- **oud:** Binnen 5 minuten online, met je eerste 10 producten. Helemaal gratis te starten.
  **nieuw:** Binnen 5 minuten online, met je eerste 10 werkzaamheden. Helemaal gratis te starten.

## `app/rekentool/page.tsx`

- **oud:** "Nee. Met Kostenplan stel je vragen, prijsregels en voorwaarden in via een visuele bouwer — zonder code, formules in een taal of technische kennis. Je kiest uit kant-en-klare onderdelen (bijvoorbeeld 'bestrating' of 'schilderwerk') of bouwt zelf een onderdeel …
  **nieuw:** "Nee. Met Kostenplan stel je vragen, prijsregels en voorwaarden in via een visuele bouwer — zonder code, formules in een taal of technische kennis. Je kiest uit kant-en-klare onderdelen (bijvoorbeeld 'bestrating' of 'schutting') of bouwt zelf een onderdeel op …
- **oud:** "Een offerteprogramma is bedoeld voor de vakman zelf: je typt er intern een offerte in die je vervolgens naar een klant stuurt. Een rekentool draait juist op de website van de vakman en wordt door de klant zelf bediend — die krijgt direct een prijsindicatie te…
  **nieuw:** "Een offerteprogramma is bedoeld voor de hovenier zelf: je typt er intern een offerte in die je vervolgens naar een klant stuurt. Een rekentool draait juist op de website van de hovenier en wordt door de klant zelf bediend — die krijgt direct een prijsindicati…
- **oud:** vraag: "Werkt een rekentool voor elk vakgebied?",
  **nieuw:** vraag: "Werkt een rekentool voor al mijn tuinwerk?",
- **oud:** "Een rekentool werkt goed voor elk vakgebied waarin de prijs is op te bouwen uit meetbare grootheden zoals oppervlakte, lengte, aantal, materiaalkeuze of extra opties — denk aan hoveniers, stratenmakers, schilders, klusbedrijven, keukenbedrijven, badkamerbedri…
  **nieuw:** "Een rekentool werkt goed voor tuinwerk, waarin de prijs is op te bouwen uit meetbare grootheden zoals oppervlakte, lengte, aantal, materiaalkeuze of extra opties — denk aan schutting, bestrating, kunstgras, vlonders en beplanting. Voor projecten die per geval…
- **oud:** Een rekentool voor je website, gebouwd voor vakmensen
  **nieuw:** Een rekentool voor je website, gebouwd voor hoveniers
- **oud:** Kostenplan is een online tool waarmee vakmensen zo&apos;n rekentool zelf bouwen
  **nieuw:** Kostenplan is een online tool waarmee hoveniers zo&apos;n rekentool zelf bouwen
- **oud:** bedrijfsnaam="Van Dijk Kozijnen" ⏎ productTitel="Bereken de prijs van je nieuwe kozijnen"
  **nieuw:** productTitel="Bereken de kosten van jouw tuin"
- **oud:** { label: "Aantal kozijnen", waarde: "6" }, ⏎ { label: "Type kozijn", waarde: "Draai-kiep" },
  **nieuw:** { label: "Oppervlakte tuin", waarde: "85 m²" },
- **oud:** contactformulier weet de vakman pas na het eerste contact of een bezoeker een
  **nieuw:** contactformulier weet de hovenier pas na het eerste contact of een bezoeker een
- **oud:** Elk vakgebied heeft zijn eigen vragen en prijsopbouw. Kies een startpunt of bouw
  **nieuw:** Elke tuinklus heeft zijn eigen vragen en prijsopbouw. Kies een startpunt of bouw
- **oud:** tekst="Begin met een kant-en-klaar onderdeel (bijv. schutting of keukenopstelling) of bouw zelf vragen, keuzes en prijsregels op."
  **nieuw:** tekst="Begin met een kant-en-klaar onderdeel (bijv. schutting of terras) of bouw zelf vragen, keuzes en prijsregels op."
- **oud:** tekst="Bekijk hoe een Kostenplan-rekentool eruitziet op de website van een hovenier, schuttingbedrijf of kozijnenbedrijf."
  **nieuw:** tekst="Bekijk hoe een Kostenplan-rekentool eruitziet op de website van een hovenier of schuttingbedrijf."
- **oud:** tekst="Ontdek de sjablonen waarmee je direct kunt starten, per vakgebied."
  **nieuw:** tekst="Ontdek de sjablonen waarmee je direct kunt starten, voor al je tuinwerk."
- **oud:** intro="Antwoorden op de vragen die vakmensen ons het vaakst stellen voordat ze starten."
  **nieuw:** intro="Antwoorden op de vragen die hoveniers ons het vaakst stellen voordat ze starten."
- **oud:** Binnen 5 minuten online, met je eerste 10 producten. Helemaal gratis te starten.
  **nieuw:** Binnen 5 minuten online, met je eerste 10 werkzaamheden. Helemaal gratis te starten.

## `app/voorbeelden-rekentools/page.tsx`

- **oud:** "Bekijk voorbeelden van rekentools voor hoveniers, bouwbedrijven, schuttingbedrijven, kozijnenbedrijven en andere vakmensen.";
  **nieuw:** "Bekijk voorbeelden van rekentools voor hoveniers: tuinaanleg, schutting, bestrating en kunstgras.";
- **oud:** bedrijfsnaam: "Van Dijk Kozijnen", ⏎ productTitel: "Bereken de prijs van je nieuwe kozijnen", ⏎ { label: "Aantal kozijnen", waarde: "6" }, ⏎ { label: "Type kozijn", waarde: "Draai-kiep" }, ⏎ resultaatLabel: "Indicatie vanaf", ⏎ cta: "Ontvang mijn prijs", ⏎ "Van Dijk Kozijnen rekent per kozijn op basis van afmetingen, materiaal en glassoort — een bezoeker die aan het oriënteren is, weet zo al vóór het eerste contact welke orde van grootte hij mag verwachten.", ⏎ linkLabel: "Bekijk de rekentool voor kozijnenbedrijven",
  **nieuw:** _(verwijderd)_
- **oud:** linkLabel: "Bekijk de rekentool voor stratenmakers",
  **nieuw:** linkLabel: "Bekijk de rekentool voor hoveniers",
- **oud:** Binnen 5 minuten online, met je eerste 10 producten. Helemaal gratis te starten.
  **nieuw:** Binnen 5 minuten online, met je eerste 10 werkzaamheden. Helemaal gratis te starten.

## `content/features/crm.mdx`

- **oud:** title: "CRM voor vakmensen — al je aanvragen overzichtelijk in één Kanban-bord"
  **nieuw:** title: "CRM voor hoveniers — al je aanvragen overzichtelijk in één Kanban-bord"
- **oud:** keywords: ["crm voor vakmensen", "leads overzicht rekentool", "kanban bord offertes"]
  **nieuw:** keywords: ["crm voor hoveniers", "leads overzicht rekentool", "kanban bord offertes"]
- **oud:** ## Waarom vakmensen een CRM nodig hebben
  **nieuw:** ## Waarom hoveniers een CRM nodig hebben

## `content/features/offertecalculator.mdx`

- **oud:** definitie: "De offertecalculator van Kostenplan is de bouwer waarmee een vakman zelf, zonder programmeerkennis, een rekentool samenstelt uit vragen, prijsregels en voorwaarden — met een live preview die precies toont wat een klant straks te zien krijgt."
  **nieuw:** definitie: "De offertecalculator van Kostenplan is de bouwer waarmee een hovenier zelf, zonder programmeerkennis, een rekentool samenstelt uit vragen, prijsregels en voorwaarden — met een live preview die precies toont wat een klant straks te zien krijgt."

## `content/features/prijsindicatie-tool.mdx`

- **oud:** definitie: "De prijsindicatie-tool van Kostenplan is het onderdeel van de rekentool waarmee een vakman zelf instelt hóe de berekende prijs aan een klant wordt getoond — als exact bedrag, als vanafprijs, als bandbreedte, of als volledige uitsplitsing per kosten… ⏎ samenvatting: "Niet elk bedrijf wil een prijs op exact dezelfde manier tonen. De prijsindicatie-instellingen laten toe om te kiezen tussen volledige transparantie (een uitgesplitste kostenopbouw) en een indicatieve marge (een prijsrange of vanafprijs), passend…
  **nieuw:** definitie: "De prijsindicatie-tool van Kostenplan is het onderdeel van de rekentool waarmee een hovenier zelf instelt hóe de berekende prijs aan een klant wordt getoond — als exact bedrag, als vanafprijs, als bandbreedte, of als volledige uitsplitsing per kost… ⏎ samenvatting: "Niet elk bedrijf wil een prijs op exact dezelfde manier tonen. De prijsindicatie-instellingen laten toe om te kiezen tussen volledige transparantie (een uitgesplitste kostenopbouw) en een indicatieve marge (een prijsrange of vanafprijs), passend…
- **oud:** Niet elk bedrijf wil, of kan, op dezelfde manier een prijs tonen. Een hovenier die met vaste materiaalprijzen werkt, kan een berekening vaak vrij exact tonen. Een aannemer die pas na een opname ter plaatse zeker weet wat een project kost, geeft liever een band…
  **nieuw:** Niet elk bedrijf wil, of kan, op dezelfde manier een prijs tonen. Een hovenier die met vaste materiaalprijzen werkt, kan een berekening vaak vrij exact tonen. Een hovenier die pas na een opname ter plaatse zeker weet wat een project kost, geeft liever een band…

## `content/kennisbank/hoe-bereken-je-arbeidskosten.mdx`

- **oud:** description: "Uitleg voor vakmensen en zzp'ers: hoe je van een uurtarief en geschatte uren tot een correcte arbeidskostenpost in een offerte komt, inclusief veelgemaakte fouten."
  **nieuw:** description: "Uitleg voor hoveniers en zzp'ers: hoe je van een uurtarief en geschatte uren tot een correcte arbeidskostenpost in een offerte komt, inclusief veelgemaakte fouten."
- **oud:** antwoord: "Van de ongeveer 1.850 beschikbare werkuren per jaar bij een fulltime werkweek gaat een deel op aan niet-declarabele tijd zoals administratie, offertes maken, reistijd, vakantie en scholing. Vakmensen houden hierdoor vaak een kleiner deel van het jaa…
  **nieuw:** antwoord: "Van de ongeveer 1.850 beschikbare werkuren per jaar bij een fulltime werkweek gaat een deel op aan niet-declarabele tijd zoals administratie, offertes maken, reistijd, vakantie en scholing. Hoveniers houden hierdoor vaak een kleiner deel van het jaa…
- **oud:** Arbeidskosten zijn voor de meeste vakmensen de grootste, en tegelijk de moeilijkst goed in te schatten, kostenpost in een offerte. Materiaal heeft een vaste inkoopprijs; arbeid hangt af van een inschatting die je zelf moet maken.
  **nieuw:** Arbeidskosten zijn voor de meeste hoveniers de grootste, en tegelijk de moeilijkst goed in te schatten, kostenpost in een offerte. Materiaal heeft een vaste inkoopprijs; arbeid hangt af van een inschatting die je zelf moet maken.
- **oud:** Dit is waar ervaring het verschil maakt. Voor terugkerend, vergelijkbaar werk (zoals het leggen van een vierkante meter bestrating, of het schilderen van een vierkante meter gevel) is het mogelijk om op basis van eerdere projecten een gemiddeld aantal uren per…
  **nieuw:** Dit is waar ervaring het verschil maakt. Voor terugkerend, vergelijkbaar werk (zoals het leggen van een vierkante meter bestrating, of het leggen van een vierkante meter gazon) is het mogelijk om op basis van eerdere projecten een gemiddeld aantal uren per een…

## `content/kennisbank/hoe-maak-je-een-offerte.mdx`

- **oud:** description: "Een praktische stap-voor-stap uitleg voor vakmensen: van eerste aanvraag tot een offerte die een klant snapt en durft te accepteren." ⏎ keywords: ["hoe maak je een offerte", "offerte opstellen vakman", "offerte maken zzp"]
  **nieuw:** description: "Een praktische stap-voor-stap uitleg voor hoveniers: van eerste aanvraag tot een offerte die een klant snapt en durft te accepteren." ⏎ keywords: ["hoe maak je een offerte", "offerte opstellen hovenier", "offerte maken zzp"]
- **oud:** antwoord: "Een mondelinge afspraak kan juridisch bindend zijn, maar is in een geschil veel moeilijker te bewijzen dan een schriftelijke offerte. Voor de duidelijkheid — voor zowel de vakman als de klant — is een schriftelijke of digitale offerte altijd aan te …
  **nieuw:** antwoord: "Een mondelinge afspraak kan juridisch bindend zijn, maar is in een geschil veel moeilijker te bewijzen dan een schriftelijke offerte. Voor de duidelijkheid — voor zowel de hovenier als de klant — is een schriftelijke of digitale offerte altijd aan t…
- **oud:** Hoe een offerte wordt verstuurd, beïnvloedt hoe snel een klant reageert. Een pdf per e-mail werkt, maar vereist dat de klant het document opent, doorleest en vervolgens los een reactie stuurt om te accepteren. Een offerte die de klant online kan bekijken en me…
  **nieuw:** Hoe een offerte wordt verstuurd, beïnvloedt hoe snel een klant reageert. Een pdf per e-mail werkt, maar vereist dat de klant het document opent, doorleest en vervolgens los een reactie stuurt om te accepteren. Een offerte die de klant online kan bekijken en me…

## `content/kennisbank/hoe-werkt-een-offerte-calculator.mdx`

- **oud:** definitie: "Een offerte calculator bestaat uit twee delen die na elkaar gebeuren: eerst een berekening die de bezoeker zelf invult, daarna — optioneel — een aanvraag die bij de vakman binnenkomt, inclusief de exacte antwoorden en de berekende prijsindicatie."
  **nieuw:** definitie: "Een offerte calculator bestaat uit twee delen die na elkaar gebeuren: eerst een berekening die de bezoeker zelf invult, daarna — optioneel — een aanvraag die bij de hovenier binnenkomt, inclusief de exacte antwoorden en de berekende prijsindicatie.…
- **oud:** De bezoeker doorloopt een reeks vragen die de vakman vooraf heeft ingesteld — bijvoorbeeld de oppervlakte van een tuin, het gewenste materiaal, of extra opties zoals een poort. Elke vraag is gekoppeld aan een prijsregel: een vaste prijs, een prijs per eenheid …
  **nieuw:** De bezoeker doorloopt een reeks vragen die de hovenier vooraf heeft ingesteld — bijvoorbeeld de oppervlakte van een tuin, het gewenste materiaal, of extra opties zoals een poort. Elke vraag is gekoppeld aan een prijsregel: een vaste prijs, een prijs per eenhei…
- **oud:** Bij de uitkomst kan de bezoeker aangeven dat hij een officiële offerte wil. Die aanvraag gaat niet los van de berekening — de exacte antwoorden en de berekende prijsindicatie worden meegestuurd, zodat de vakman niet opnieuw hoeft te vragen wat de klant precies…
  **nieuw:** Bij de uitkomst kan de bezoeker aangeven dat hij een officiële offerte wil. Die aanvraag gaat niet los van de berekening — de exacte antwoorden en de berekende prijsindicatie worden meegestuurd, zodat de hovenier niet opnieuw hoeft te vragen wat de klant preci…
- **oud:** Zonder offerte calculator moet elke aanvraag eerst beoordeeld worden om te weten of hij past bij het aanbod en budget van de vakman — dat kost tijd, ook bij aanvragen die uiteindelijk niets worden. Met een offerte calculator heeft de klant zelf al gezien wat d…
  **nieuw:** Zonder offerte calculator moet elke aanvraag eerst beoordeeld worden om te weten of hij past bij het aanbod en budget van de hovenier — dat kost tijd, ook bij aanvragen die uiteindelijk niets worden. Met een offerte calculator heeft de klant zelf al gezien wat…

## `content/kennisbank/wat-is-calculatiesoftware.mdx`

- **oud:** description: "Calculatiesoftware helpt vakmensen en aannemers de kosten van een project vooraf te berekenen — materiaal, arbeid en marge. Uitleg, toepassingen en het verschil met een online offertecalculator." ⏎ keywords: ["calculatiesoftware", "wat is calculatiesoftware", "bouwcalculatie", "kostencalculatie vakman"]
  **nieuw:** description: "Calculatiesoftware helpt hoveniers de kosten van een project vooraf te berekenen — materiaal, arbeid en marge. Uitleg, toepassingen en het verschil met een online offertecalculator." ⏎ keywords: ["calculatiesoftware", "wat is calculatiesoftware", "bouwcalculatie", "kostencalculatie hovenier"]
- **oud:** samenvatting: "Calculatiesoftware is intern gereedschap voor de vakman zelf: hij voert per project de benodigde materialen, uren en kosten in en de software rekent dat om naar een kostprijs en verkoopprijs. Dat is iets anders dan een online rekentool waarmee d…
  **nieuw:** samenvatting: "Calculatiesoftware is intern gereedschap voor de hovenier zelf: hij voert per project de benodigde materialen, uren en kosten in en de software rekent dat om naar een kostprijs en verkoopprijs. Dat is iets anders dan een online rekentool waarmee…
- **oud:** antwoord: "Normaal gesproken niet — calculatiesoftware is bedoeld voor intern gebruik door de vakman of calculator. Wil je dat de klant zelf een prijs kan berekenen, dan is een online rekentool of offertecalculator op de website het passende gereedschap."
  **nieuw:** antwoord: "Normaal gesproken niet — calculatiesoftware is bedoeld voor intern gebruik door de hovenier of calculator. Wil je dat de klant zelf een prijs kan berekenen, dan is een online rekentool of offertecalculator op de website het passende gereedschap."
- **oud:** Calculatiesoftware is een categorie bedrijfssoftware die vakmensen, aannemers en calculators helpt om de kostprijs van een project systematisch te berekenen vóórdat er een offerte wordt uitgebracht. In plaats van met de hand alle materiaal- en arbeidskosten bi…
  **nieuw:** Calculatiesoftware is een categorie bedrijfssoftware die hoveniers en calculators helpt om de kostprijs van een project systematisch te berekenen vóórdat er een offerte wordt uitgebracht. In plaats van met de hand alle materiaal- en arbeidskosten bij elkaar op…
- **oud:** Voor grotere aannemersbedrijven is calculatiesoftware vaak gekoppeld aan een breder ERP- of projectadministratiesysteem; voor kleinere vakbedrijven is het vaker een op zichzelf staand programma of spreadsheet-achtige tool.
  **nieuw:** Voor grotere hoveniersbedrijven is calculatiesoftware vaak gekoppeld aan een breder ERP- of projectadministratiesysteem; voor kleinere hoveniersbedrijven is het vaker een op zichzelf staand programma of spreadsheet-achtige tool.
- **oud:** 1. **Project** — de overkoepelende klus, bijvoorbeeld "verbouwing badkamer familie De Vries."
  **nieuw:** 1. **Project** — de overkoepelende klus, bijvoorbeeld "aanleg tuin familie De Vries."
- **oud:** | Wie voert de berekening uit | De vakman of calculator zelf, intern | De klant zelf, op de website |
  **nieuw:** | Wie voert de berekening uit | De hovenier of calculator zelf, intern | De klant zelf, op de website |
- **oud:** Calculatiesoftware en een online offertecalculator sluiten elkaar dus niet uit — ze bedienen twee verschillende momenten in hetzelfde verkoopproces. Een vakman kan calculatiesoftware gebruiken voor complexe, maatwerkprojecten waarbij elk detail telt, en tegeli…
  **nieuw:** Calculatiesoftware en een online offertecalculator sluiten elkaar dus niet uit — ze bedienen twee verschillende momenten in hetzelfde verkoopproces. Een hovenier kan calculatiesoftware gebruiken voor complexe, maatwerkprojecten waarbij elk detail telt, en tege…
- **oud:** Calculatiesoftware is intern gereedschap waarmee een vakman de kostprijs van een project systematisch opbouwt uit materiaal, arbeid en marge, meestal ná een eerste aanvraag. Het is functioneel iets anders dan een online rekentool waarmee de klant zelf, vóór en…
  **nieuw:** Calculatiesoftware is intern gereedschap waarmee een hovenier de kostprijs van een project systematisch opbouwt uit materiaal, arbeid en marge, meestal ná een eerste aanvraag. Het is functioneel iets anders dan een online rekentool waarmee de klant zelf, vóór …

## `content/kennisbank/wat-is-een-offertecalculator.mdx`

- **oud:** keywords: ["offertecalculator", "wat is een offertecalculator", "prijscalculator vakman", "online offerte tool"]
  **nieuw:** keywords: ["offertecalculator", "wat is een offertecalculator", "prijscalculator hovenier", "online offerte tool"]
- **oud:** samenvatting: "Een offertecalculator vervangt het handmatig opstellen van losse offertes voor elke aanvraag door een vooraf ingestelde rekenlogica die de klant zelf doorloopt. De vakman stelt eenmalig zijn tarieven en prijsregels in; daarna berekent elke bezoe…
  **nieuw:** samenvatting: "Een offertecalculator vervangt het handmatig opstellen van losse offertes voor elke aanvraag door een vooraf ingestelde rekenlogica die de klant zelf doorloopt. De hovenier stelt eenmalig zijn tarieven en prijsregels in; daarna berekent elke bez…
- **oud:** antwoord: "Voor elk bedrijf dat vergelijkbare diensten of producten levert met een prijsopbouw die te herleiden is tot vaste regels — denk aan hoveniers, aannemers, schilders, installatiebedrijven en andere vakmensen die offertes baseren op arbeid, materiaal e…
  **nieuw:** antwoord: "Voor elk bedrijf dat vergelijkbare diensten of producten levert met een prijsopbouw die te herleiden is tot vaste regels — denk aan hoveniers die offertes baseren op arbeid, materiaal en oppervlakte of aantallen."
- **oud:** Het woord "offerte" in de naam wijst op het vervolg: na de berekening kan de bezoeker, als de prijs hem aanspreekt, direct een offerte aanvragen. Die aanvraag komt dan niet als een lege, algemene contactaanvraag binnen, maar inclusief de exacte keuzes en de be…
  **nieuw:** Het woord "offerte" in de naam wijst op het vervolg: na de berekening kan de bezoeker, als de prijs hem aanspreekt, direct een offerte aanvragen. Die aanvraag komt dan niet als een lege, algemene contactaanvraag binnen, maar inclusief de exacte keuzes en de be…
- **oud:** Een stratenmaker biedt op zijn website een rekentool aan voor het leggen van bestrating. Een bezoeker vult in:
  **nieuw:** Een hovenier biedt op zijn website een rekentool aan voor het leggen van bestrating. Een bezoeker vult in:
- **oud:** Een offertecalculator en calculatiesoftware worden soms door elkaar gehaald, maar zijn functioneel verschillend. Calculatiesoftware is intern gereedschap: de vakman zelf vult er de gegevens van één specifiek project in en berekent daarmee zijn eigen offerte, a…
  **nieuw:** Een offertecalculator en calculatiesoftware worden soms door elkaar gehaald, maar zijn functioneel verschillend. Calculatiesoftware is intern gereedschap: de hovenier zelf vult er de gegevens van één specifiek project in en berekent daarmee zijn eigen offerte,…

## `content/kennisbank/wat-moet-er-in-een-offerte-staan.mdx`

- **oud:** Een volledige offerte beschermt zowel de klant als de vakman: de klant weet precies waar hij aan toe is, en de vakman heeft een duidelijke, schriftelijke basis voor het werk dat is afgesproken. Voor terugkerend werk hoeft niet elk van deze onderdelen steeds op…
  **nieuw:** Een volledige offerte beschermt zowel de klant als de hovenier: de klant weet precies waar hij aan toe is, en de hovenier heeft een duidelijke, schriftelijke basis voor het werk dat is afgesproken. Voor terugkerend werk hoeft niet elk van deze onderdelen steed…
