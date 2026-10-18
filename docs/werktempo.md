# Werktempo in uur, dagdeel of dag

Een onderdeel heeft een werktempo (bijv. 12 m² per dagdeel). De hovenier kiest per onderdeel in welke eenheid dat staat; zonder eigen keuze volgt het onderdeel de eenheid van de rekentool.

## Hoe het is opgeslagen
- `CostSettings.arbeidStapEenheid` (per rekentool): uur, dagdeel of dag. Het arbeidstarief staat als **drie losse velden** (`arbeidTariefUur/Dagdeel/Dag`); alleen dat van de gekozen eenheid telt. De eenheid van het werktempo en die van het tarief waren altijd al aan elkaar gekoppeld, via deze ene instelling.
- `Product.werktempoEenheid` (nieuw, optioneel): de eigen eenheid van het werktempo van een onderdeel (en van het werktempo per materiaal). `null` = volg de rekentool. Niet te verwarren met `Product.eenheid` (m², stuks, …).
- `Company.urenPerDagdeel` en `Company.urenPerDag` (nieuw, standaard 4 en 8): wat een dagdeel en een dag in uren zijn, per hovenier.
- Migratie `20261024090000_werktempo_eenheid`: alleen nieuwe kolommen met een standaard of leeg; bestaande gegevens en prijzen veranderen niet. Terugdraaien = de drie kolommen verwijderen.

## Rekenregel (app/lib/werktempo.ts, app/lib/pricing/engine.ts)
Uren zijn de basis. Nergens anders in de code wordt met 4 of 8 vermenigvuldigd: alles loopt via `urenPerEenheid`, `convertWerktempo` en `convertTarief`.

```
uren nodig     = hoeveelheid / werktempo × urenPerEenheid(eenheid van het onderdeel)
arbeidskosten  = uren nodig × uurtarief
uurtarief      = tarief van de rekentool / urenPerEenheid(eenheid van de rekentool)
```
De kern rekent de arbeidstijd uit in de eenheid van de rekentool (tarief en weergave blijven zoals ze waren). Is de eenheid van het onderdeel gelijk aan die van de rekentool, dan is de som exact dezelfde als voorheen (bestaande prijzen veranderen niet). Afronden (`arbeidAfronden`) gebeurt in de eenheid van de rekentool, zodat de prijs niet afhangt van de eenheid van het onderdeel.

## Wissels
Alle wissels tonen eerst een dialog (Bevestigen / Annuleren) en slaan daarna alles in één transactie op; annuleren schrijft niets.
- **Eén onderdeel** (editor, "Rekenen met"): eenheid en omgerekend werktempo (ook per materiaal) samen. Terugzetten naar "Standaard" rekent terug naar de eenheid van de rekentool. Gasten hebben geen keuze (hun werktempo staat in de eenheid van hun tarief).
- **Eenheid van de rekentool** (Prijzen → Reken in, Profiel → Tarieven): het werktempo van onderdelen zonder eigen eenheid wordt omgerekend, het tarief per nieuwe eenheid wordt zo gezet dat de prijs per uur gelijk blijft (€ 45 per uur wordt € 180 per dagdeel), een eigen tarief per onderdeel gaat mee. Onderdelen met een eigen eenheid blijven ongemoeid.
- **Uren-definities** (Profiel → Tarieven): onderdelen in de eenheid van hun rekentool houden hun prijs. Alleen onderdelen met een *andere* eigen eenheid hangen ervan af; de dialog laat ze zien en de hovenier kiest: prijs gelijk houden (hun werktempo wordt aangepast) of laten meebewegen.

## Bestaande offertes en aanvragen
Een aanvraag bewaart zijn eigen momentopname (`Lead.snapshot`, `totaalIndicatie`) en een offerte of factuur zijn eigen `inhoud` met bedragen. Die worden nooit uit instellingen of producten herberekend, dus een wissel of andere uren-definitie verandert ze niet (getest). De publieke rekentool en de embed rekenen wel live mee (via de gepubliceerde momentopname), zoals altijd.

## Precisie
Intern volle precisie; in de UI maximaal 2 decimalen (`formatWerktempo`). `schoon()` haalt floating-pointruis weg, zodat heen-en-weer omrekenen (ook met 3,5 en 7,5 uur) exact dezelfde waarde teruggeeft. In een invoerveld staat het werktempo met volle precisie (bijv. 4,666666666666667); dat is wat er wordt opgeslagen.

## Tests
`app/lib/werktempo.test.ts` (alle richtingen, standaard en aangepaste uren, plannen), `app/lib/werktempo-server.test.ts` (database, met `TEST_DATABASE_URL`), `e2e/werktempo-eenheid.spec.ts` (dialogs op 412 en 1440).
