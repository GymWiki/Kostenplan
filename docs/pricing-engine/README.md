# Rekenkern

Eén rekenkern (`app/lib/pricing`) is de enige bron van waarheid voor prijzen. De klant-rekentool, de editor, de kostenopbouw, de opgeslagen aanvraag, de offerte, de mails en de PDF tonen dezelfde bedragen, tot op de cent. Audit: `audit.md`.

## Wat er is

| Onderdeel | Bestand |
|---|---|
| Kern: `berekenPrijs(config, invoer)` | `app/lib/pricing/engine.ts` |
| Configuratie en invoer (zod) | `schema.ts` |
| Afronding, totalen en btw | `rond.ts`, `totalen.ts` |
| Bedragen, hoeveelheden en eenheden opmaken | `format.ts` |
| Van bestaande producten/keuzes naar de kern | `adapters.ts` |
| Server: opnieuw rekenen bij een aanvraag | `server.ts`, `app/lib/lead-aanmaken.ts` |
| Momentopname van een aanvraag | `app/lib/lead-snapshot.ts` |
| Offerte uit die momentopname | `app/lib/offerte/uit-lead.ts` |
| Regressierapport | `regressie.ts`, `scripts/prijzen-regressie.ts` |

De kern is puur TypeScript (geen React, database of netwerk) en draait in de browser en op de server. Bedragen in de uitvoer zijn gehele centen.

### Regels

- **Afronden**: elke regel op hele centen, half omhoog. De btw wordt per regel berekend over het bedrag in centen. Het totaal is altijd de som van de regels (excl., btw en incl.); er is geen ander afrondingsmoment.
- **Per onderdeel**: een regel per materiaalcategorie (aantal × prijs per eenheid, met stapgrootte), een regel per gekozen extra of toeslag, een regel per artikeltype, arbeid (hoeveelheid / werktempo × tarief, het werktempo van het gekozen materiaal gaat voor, optioneel naar boven afgerond) en transport en voorrijkosten (vast, meeschalend of per begonnen werkdag).
- **Vaste kosten**: `PER_ONDERDEEL` (zoals alle bestaande rekentools) of `PER_AANVRAAG` (één keer, het hoogste vaste bedrag telt).
- **Bandbreedte** (van–tot): per product (laagste en hoogste materiaalprijs) of een marge over het totaal. De regels tonen het midden.
- **KOR**: geen btw.
- **Doorlooptijd**: arbeid in dagdelen en het aantal begonnen werkdagen.
- **Waarschuwingen**: ontbrekende prijs, ontbrekende of onbekende keuze, geen werktempo, ongeldige of onwaarschijnlijke invoer, onvolledige bandbreedte.
- **Robuust**: lege invoer, 0, negatief, NaN, oneindig en zeer grote waarden geven 0 of een begrensde waarde plus een waarschuwing, nooit een kapotte prijs.

### Aanvraag

De browser stuurt de keuzes van de klant (`snapshot.rekenkern.invoer`) en zijn eigen uitkomst mee. De server rekent opnieuw met dezelfde kern en de configuratie van dat moment, bewaart zijn eigen uitkomst als momentopname (invoer, vingerafdruk van de configuratie en de volledige opbouw) en gebruikt dat voor `Lead.totaalIndicatie`, de mail en de push. Wijkt het servertotaal af van wat de klant zag, dan staat dat in de momentopname (`afwijking`) en in de serverlog (`[prijs] servertotaal wijkt af van de browser`, met invoer en regels). Een aanvraag zonder invoer (oudere browser, reserve-ingest) wordt opgeslagen zoals hij is, gemarkeerd als `bron: "client"`, en gelogd.

### Offerte

De offerte bouwt haar regels uit `snapshot.rekenkern`: elke offerteregel heeft precies het bedrag van de kernregel (bij een prijs met een deel van een cent per eenheid wordt het één post), dus het offertetotaal is gelijk aan het totaal van de klant, voor een particulier (incl. btw) en voor een zakelijke klant (excl. btw). Nooit uit de huidige configuratie. Oudere aanvragen zonder rekenkern gebruiken de uitsplitsing per onderdeel of, als die er niet is, de totalen per kostensoort.

## Controle

- `npm test`: o.a. `app/lib/pricing/*.test.ts` (kern, per rekenmethode, gouden voorbeelden, eigenschappen met fast-check, gelijk totaal, vergelijking met de oude berekening, regressie) en `bekende-bugs.test.ts`.
- `app/lib/pricing/gouden-voorbeelden.json`: twaalf voorbeelden met de hand uitgerekend, met uitleg per regel.
- `node scripts/mobile-ux/aanvraag-rekenkern.js` en `offerte-gelijk-totaal.js` (lokale app): echte rekentool → aanvraag → server → offerte.
- Regressierapport: `npm run prijzen:regressie` (alleen lezen, met `DATABASE_URL`; `-- --md bestand.md` schrijft het rapport weg). Vergelijkt voor elke rekentool met een vaste set voorbeeldinvoer de oude berekening (bevroren in `app/lib/pricing/legacy`) met de kern. Een uitslag "ONDERZOEKEN" geeft exit-code 1. Het rapport op de lokale testdata staat in `regressie-lokaal.md`.

## Beslissingen en wijzigingen

1. **Afronding per regel** in plaats van over het eindtotaal: het totaal kan een paar cent afwijken van de oude berekening (hoogstens ± een cent per regel). Gemeten op 400 willekeurige gevallen in `vergelijk-oud.test.ts`.
2. **Vaste kosten blijven per onderdeel** voor bestaande rekentools. De opdracht noemt "één keer per aanvraag", maar dat verandert de prijs van elke rekentool met meer dan één onderdeel, en prijzen mochten niet veranderen. `PER_AANVRAAG` is gebouwd en getest (`vasteKosten` in de configuratie); er is nog geen instelling die het aanzet.
3. **Offerte-btw volgt de rekentool.** Vroeger kreeg een regel met een plantennaam automatisch 9%, waardoor het offertetotaal afweek van wat de klant zag. Nu volgt elke regel het btw-tarief van de rekentool; een eigen tarief per regelsoort in het Profiel gaat voor, en voor planten volgt een waarschuwing.
4. **Nieuwe offertes rekenen de btw per regel** (`rekenregel: 2`); bestaande v2-offertes en alle oude (v1) offertes tonen hun bedragen zoals ze verstuurd zijn.
5. **Formule-gebaseerde ("Aangepaste") rekentools** houden hun formule-motor. Alleen het geld loopt door dezelfde afrondingsregel en btw-regel, en de server rekent ze na (`berekenModulair`).
6. **Eenheden** worden getoond als m, m², m³ en stuks (`formatEenheid`); het oude label "m¹" is alleen nog te zien in de beheerlijst van eenheden.
7. De oude berekening staat bevroren in `app/lib/pricing/legacy` (alleen voor het regressierapport en de vergelijkingstest).

## Open punten

- **Regressierapport op productie** is niet gedraaid: de database van Kostenplan was voor mij niet bereikbaar. Draai `npm run prijzen:regressie` met de productie-`DATABASE_URL`.
- **KOR in de klant-rekentool**: de kern ondersteunt het, maar een hovenier met KOR ziet in de rekentool nog btw (zoals vandaag). De offerte volgt de instelling in Profiel. Een aparte keuze nodig.
- **Doorlooptijd** wordt berekend maar nergens getoond.
- Voor een aanvraag laadt de server de hele rekentool (producten, materialen, extra's); dat is één query per aanvraag.
