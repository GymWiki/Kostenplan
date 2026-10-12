# Audit: waar worden prijzen berekend?

Stand: branch `pricing-engine`, vóór de rekenkern. "Euro" betekent drijvende-komma-bedragen in euro's, "cent" betekent gehele centen.

## 1. Plekken met een eigen berekening

| # | Bestand · functie | Wat wordt er berekend | Rekent in | Afronding | Draait waar |
|---|---|---|---|---|---|
| 1 | `app/lib/calculate.ts` · `calculateBreakdown`, `berekenProductKosten`, `berekenMateriaalRegels` | Materiaal (alle categorieën), arbeid, transport, voorrijkosten, extra's, btw, totaal per onderdeel en totaal | euro (float) | geen per regel; `btw` is `subtotaal × %` zonder afronding | browser (klant-rekentool, editor) |
| 2 | `app/lib/calculate.ts` · `calculateBreakdownRange` | Bandbreedte (per onderdeel min/max of totaal ± marge) | euro | `round2` op min/max-totaal (alleen modus TOTAAL) | browser |
| 3 | `app/portaal/[slug]/calculator.tsx` · `eigenProductPrijs` | Prijs op de onderdeelkaart | euro | geen | browser. **Eigen kopie**: telt extra's en toeslagen niet mee, dus de kaart kan afwijken van het totaal |
| 4 | `app/portaal/[slug]/calculator.tsx` · `effectiveProductQty`, `productRegelsBedrag` | Hoeveelheid uit sjabloon (lengte × breedte, ruimtes, artikelregels) | euro | geen | browser. De server ziet alleen het resultaat |
| 5 | `app/lib/sjablonen.ts` · `berekenHoeveelheid` (per sjabloon) | Hoeveelheid / artikelregels | float | geen | browser, dashboard |
| 6 | `app/lib/lead-snapshot.ts` · `bouwLeadSnapshot` | Momentopname van de berekening voor de lead | euro | geen | **browser**; de server slaat het ongezien op |
| 7 | `app/lib/lead-aanmaken.ts` · `maakLead` | Slaat `snapshot.totaal` op als `Lead.totaalIndicatie` | euro | geen | server. **Vertrouwt het bedrag van de client** (`leadSnapshotSchema` controleert alleen de vorm) |
| 8 | `app/lib/werkzaamheid-kosten.ts` · `berekenKostenOpbouw` | "20 m² kost je klant €X" en de kostenopbouw in editor, mobiele editor, landing | euro | geen | browser. Roept `calculateBreakdown` aan, maar berekent `arbeidstijd` en `transportDagen` zelf opnieuw (negeert `arbeidAfronden`) |
| 9 | `app/dashboard/tools/[toolId]/producten/velden/kosten-blok.tsx` · `KostenUitsplitsing` + `product-form.tsx` | Rekenvoorbeeld in het oude productformulier | euro | geen | browser. **Eigen kopie** met `berekenProductKosten`: kent geen extra's/toeslagen, geen transport per dag en geen werktempo per materiaal |
| 10 | `app/components/landing/hero-demo.tsx`, `sectie-aanvragen.tsx` | Demo-bedragen op de landingspagina | euro | geen | browser, via #8 |
| 11 | `app/lib/calculator-engine/*` (`pricing.ts`, `result.ts`, `modulair.ts`) + `app/portaal/[slug]/engine-calculator.tsx` | Tweede, formule-gebaseerde motor voor "Aangepaste" rekentools (`activeCalculatorConfig`): regels, btw, afronding op hele euro's, bandbreedte | euro | `round2` op subtotaal en btw; `applyPrijsAfronding` op het eind | browser |
| 12 | `app/lib/werkzaamheid-engine.ts`, `werkzaamheid-classificeer.ts` | Vertaalt een onderdeel naar de formule-motor en vergelijkt totalen | euro | – | dashboard, tests |
| 13 | `app/lib/offerte/uit-lead.ts` · `bouwOfferteUitLead` | Offerteregels uit de snapshot (v2) | cent | `Math.round(euro × 100)` per prijs-per-eenheid, daarna aantal × prijs in `bereken.ts` | server |
| 14 | `app/lib/offerte/bereken.ts` · `berekenTotalen` | Regelbedragen, korting, btw per tarief, KOR, totaal van een offerte | cent | per regel (half-up) | browser + server |
| 15 | `app/lib/offerte/btw-config.ts` | Btw per regelsoort; planten standaard 9% | – | – | beide. **Wijkt af van de rekentool**, die één btw-percentage voor alles heeft |
| 16 | `app/lib/offertes.ts` · `prefillOfferteRegels`, `berekenOfferteTotalen`, `berekenVerzendControles` | Oude (v1) offerte: één regel per onderdeel, restpost, totalen | euro | `round2` op restpost | server, browser |
| 17 | `app/lib/offerte-pdf.tsx`, `app/offerte/[token]/offerte-presentatie.tsx` | Oude (v1) PDF en publieke pagina | euro | via #16 | server |
| 18 | `app/lib/offerte/controle.ts` | Vergelijkt offertetotaal met `bron.totaalRekentoolInclCenten` (drempel) | cent | – | beide |
| 19 | `app/lib/mail/lead-mail.ts`, `app/lib/push/*` | Toont `totaalIndicatie` uit de database in mail en push | euro | `formatCurrency` | server |
| 20 | `app/lib/format.ts`, `app/lib/offerte/weergave.ts` (`formatCents`, `formatAantal`), `kosten-opbouw-kaart.tsx` (`getal`), `mobiele-editor.tsx` (`€${…}`), `app/lib/landing/feiten.ts` (`eur`) | Opmaak van bedragen en hoeveelheden | – | verschillend | beide. Vijf manieren om een bedrag te tonen |

## 2. Waar ze van elkaar verschillen

1. **Twee motoren.** `calculate.ts` (onderdelen met materiaalcategorieën) en `calculator-engine` (formules) hebben eigen btw-, afrondings- en bandbreedteregels. Het totaal van een rekentool komt dus uit de ene of de andere, afhankelijk van `activeCalculatorConfig`.
2. **Euro-floats zonder afrondingsregel** in `calculate.ts`: het totaal is `subtotaal × 1,21` zonder afronden, dus `totaal` kan tientallen decimalen hebben en de getoonde regels tellen niet altijd op tot het getoonde totaal. De offerte rondt per regel af en kan daardoor enkele centen afwijken (tests staan op ≤ 5 cent).
3. **Btw**: rekentool één percentage; offerte per regelsoort (planten 9%). Dat geeft bij plantenregels een ander totaal. KOR bestaat alleen in de offerte.
4. **Eigen kopieën** van de onderdeelberekening (#3 en #9) laten extra's/toeslagen en transport per dag weg.
5. **De server rekent nooit na.** De browser bouwt de snapshot en `maakLead` slaat het bedrag op. Een afwijkende of gemanipuleerde client levert een afwijkend bedrag in de lead, de mail en de push.
6. **Snapshots van vóór de opbouw** (`opbouw` ontbreekt) geven bij het maken van een offerte één regel per onderdeel of, in de oude v1-route, een restpost.
7. **Bandbreedte**: de snapshot bewaart alleen het midden (v2) of de bovengrens (`bedragTop` voor `totaalIndicatie`); de offerte gebruikt het midden.
8. **Doorlooptijd** wordt nergens berekend of getoond; alleen de arbeidstijd per onderdeel bestaat.

## 3. De twee bekende bugs: stand op `main`

| Bug | Stand | Bewijs |
|---|---|---|
| Rekenvoorbeeld telt alleen de materiaalkosten van de eerste categorie | **Grotendeels al verholpen** voor de klant-berekening en de editorvoorbeelden (`berekenMateriaalRegels` telt alle categorieën). Niet verholpen: het oude productformulier (#9) heeft een eigen kopie en `berekenKostenOpbouw` geeft geen regel per categorie terug | `app/lib/pricing/bekende-bugs.test.ts` |
| Offerte uit aanvraag: regels op €0 per eenheid en alles in "Materiaal- en overige kosten" | **Verholpen voor nieuwe leads in offerte v2** (`bouwOfferteUitLead`). **Nog aanwezig** in de v1-route (`prefillOfferteRegels` via "Opnieuw berekenen") voor leads zonder prijs per regel, en voor v1 ook als er wel een prijs is (één samengevoegde regel per onderdeel) | `app/lib/pricing/bekende-bugs.test.ts` |

## 4. Na de rekenkern

Alle berekeningen uit de tabel in paragraaf 1 lopen nu via `app/lib/pricing`:

| # | Nu |
|---|---|
| 1–2 | `calculateBreakdown` en `calculateBreakdownRange` in `calculate.ts` zijn dunne laagjes boven `berekenPrijs()`; de klant-rekentool roept `berekenPrijs()` rechtstreeks aan |
| 3 | `eigenProductPrijs` is verwijderd: de onderdeelkaart toont het bedrag van het onderdeel uit dezelfde berekening als het totaal |
| 4–5 | de hoeveelheid uit het sjabloon wordt in de kern berekend uit de ruwe invoer van de klant |
| 6–7 | de browser bouwt de momentopname met `bouwLeadSnapshot()` uit het resultaat van de kern; `maakLead` laat de server opnieuw rekenen (`herberekenAanvraag`) en bewaart de uitkomst van de server |
| 8 | `berekenKostenOpbouw` gebruikt de kern en geeft een regel per materiaalcategorie |
| 9 | `KostenUitsplitsing` toont de opbouw uit `berekenKostenOpbouw`; de eigen kopie is weg |
| 10 | via #8 |
| 11–12 | de formule-gebaseerde motor blijft de rekenaar van de formules (`berekenModulair`, gedeeld door browser en server), maar de bedragen lopen door dezelfde afronding en btw-regel (`bouwResultaat`) |
| 13–14 | `bouwOfferteUitLead` bouwt uit `snapshot.rekenkern`; `berekenTotalen` gebruikt dezelfde afrondingsregel (offertes met `rekenregel: 2`) |
| 15 | de offerte volgt het btw-tarief van de rekentool; een eigen tarief per regelsoort uit het Profiel gaat voor |
| 16 | `prefillOfferteRegels` (oude offertes) bouwt via dezelfde functie als de nieuwe offerte. De totalen van bestaande oude offertes zijn bewust niet aangepast |
| 17 | de oude PDF en publieke pagina tonen de bedragen van de oude offerte |
| 18–19 | gebruiken de totalen uit de kern of de offerte |
| 20 | `app/lib/pricing/format.ts` is de enige opmaak van bedragen, hoeveelheden en eenheden; `formatCurrency`, `formatCents` en `formatAantal` verwijzen ernaar |
