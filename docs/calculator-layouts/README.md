# Weergaven en plaatsing van de klant-rekentool

Een hovenier kiest hoe zijn rekentool eruitziet en waar hij staat. Drie weergaven en twee plaatsingen, allemaal op dezelfde data, dezelfde rekenkern (`app/lib/pricing`) en hetzelfde aanvraagformulier.

| | |
|---|---|
| **Weergaven** | *Tegels* (standaard voor nieuwe rekentools), *Stappen*, *Alles op één pagina* (standaard voor alle bestaande rekentools; verandert niets tot de hovenier zelf kiest) |
| **Plaatsing** | *In de pagina* (zoals altijd), *Knop met pop-up* |
| **Per plek op de site** | een variant van de code: andere weergave, een selectie onderdelen (één onderdeel = direct de configurator), deep link (`?kp=schutting` of `#schutting`) |

## Hoe het in elkaar zit
- **Gedeelde kern** (`app/lib/weergave/`): het *tuinplan* van de klant (`tuinplan.ts`), de bedragen per onderdeel (`bedragen.ts`), de *vanaf*-prijs (`vanaf.ts`, rekent met de kern, het goedkoopste materiaal en een voorbeeldmaat, zonder werkgebied en minimum, dus nooit hoger dan een echte berekening) en de instellingen (`config.ts`, opgeslagen in `Tool.weergaveConfig`). Alle weergaven maken de invoer voor de rekenkern met dezelfde functie (`planInvoer`): dezelfde keuzes geven overal hetzelfde totaal en dezelfde aanvraag.
- **Weergave-componenten** (`app/portaal/[slug]/weergaven/`): `tegels.tsx`, `stappen.tsx`, `overzicht.tsx`. De lijst is de bestaande weergave, gebouwd op dezelfde kern. De `ProductCard` is de ene configurator voor alle weergaven.
- **Tuinplan bewaren**: `sessionStorage` per rekentool (met try/catch), zodat herladen of terug navigeren niets wist.
- **Prijs vóór contactgegevens**; de optie "Prijs pas tonen na de contactgegevens" staat standaard uit, met uitleg in de editor.
- **Laadscript v2** (`public/kp/v2.js`; v1 blijft ongewijzigd werken): pop-up in een Shadow DOM (focus-trap, Escape, terug-gebaar, geblokkeerd scrollen zonder verspringen), varianten via data-attributen, deep link, en het melden van het zichtbare deel van de iframe, zodat een vaste onderbalk of een venster in een iframe op de site van de hovenier op de goede plek staat.
- **Embed-pagina** (`/embed/<toolId>`): de weergave komt uit de gepubliceerde momentopname (ook zonder database); de code van een plek kan hem overschrijven met `?weergave=…&onderdelen=…&open=…&modus=popup`.
- **Editor**: een eigen paneel *Weergave voor je klant* (weergave + plaatsing; de rekentool in het midden wisselt direct mee). Vindbaar via: mobiel een eigen regel onder de onderdelen ("Tegels · in de pagina"), desktop de knop *Weergave* in de bovenbalk en een klik op de kop, de onderbalk, het overzicht of de lijstkop in Bewerken; bij een nieuwe rekentool één keer een tip (`weergaveConfig.tip`, wegklikbaar, niet in de publieke momentopname). Gasten kiezen hem ook (bewaard in het concept, meegenomen bij het importeren). *Tegel in de rekentool* per onderdeel (eigen tekst, maat voor de vanaf-prijs), varianten met eigen code en voorbeeld onder *Zet op mijn website*.
- **Naam van een onderdeel**: op één plek, de kop van het paneel (desktop: veld; mobiel: tik op de naam in de kop van de sheet). Een nieuw leeg onderdeel heet "Nieuw onderdeel" en heeft de cursor direct in het naamveld; een lege naam wordt niet opgeslagen ("Geef dit onderdeel een naam"). Zie `onderdeel-naam.tsx`.
- **Meten** (zonder persoonsgegevens): `VISIT`, `ONDERDEEL_GEOPEND`, `ONDERDEEL_TOEGEVOEGD`, `OVERZICHT_BEKEKEN`, `AANVRAAG_GESTART`, `AANVRAAG_VERSTUURD`, `POPUP_GEOPEND`, met weergave en plaatsing. Op de kaart in het Rekentools-overzicht: bezoekers, toevoegingen en aanvragen van de laatste 30 dagen, en per weergave naast elkaar.

## Bewuste keuzes
- Op desktop klapt een tegel open over de volle breedte van het raster onder zijn rij (rustiger dan een zijpaneel); op mobiel is het een bottom sheet.
- Aangepaste rekentools (formule-gebaseerd, "Aangepast") hebben hun eigen weergave en doen niet mee; ze blijven zoals ze zijn.
- De varianten in de editor staan alleen in de browser van de hovenier; de code zelf is wat telt.
- De vanaf-prijs bestaat voor *Eén hoeveelheid* en *Lengte × breedte*. Ruimtes en artikelregels hebben geen vaste maat: de tegel toont dan geen vanaf-prijs.
- Verandert de plaatsing (in de pagina ↔ pop-up)? Dan moet de code op de site opnieuw worden gekopieerd (de plaatsing staat in de code). De weergave past zich vanzelf aan (uit de momentopname).

## Schermafbeeldingen en GIF's
Gemaakt met `scripts/test/layouts-media.js` (390 × 844 en 1440 × 900). Per weergave: `<weergave>-<mobiel|desktop>-<stap>.png` en `<weergave>-<mobiel|desktop>.gif`; de pop-up: `popup-…`.
