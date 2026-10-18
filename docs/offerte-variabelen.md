# Variabelen in berichten (offerte-instellingen en meer)

In de tekst van een bericht staan variabelen als `{naam}`. In de editor worden ze getoond als gekleurde blokjes die je kunt slepen; opgeslagen wordt gewoon de tekst met `{sleutel}` (geen migratie, bestaande teksten werken ongewijzigd).

## Waar leeft wat

| Wat | Waar |
| --- | --- |
| Alle variabelen (sleutel, label, voorbeeld, groep, kleur, in welke berichten beschikbaar) | `app/lib/sjabloon/variabelen.ts` (`VARIABELEN`, `GROEPEN`) |
| Invullen (`renderTemplate`), parseren, invoegen/verplaatsen/verwijderen op tekstposities | `app/lib/sjabloon/render.ts` |
| Editor (contenteditable, native slepen, tikken om in te voegen, voorbeeld, waarschuwingen) | `app/components/ui/bericht-editor.tsx`, `bericht-editor-dom.ts` |
| Kleuren van de blokjes | CSS-variabelen `--chip-<kleur>-bg/-fg/-rand` in `app/globals.css` (licht en donker) |
| Waar het bericht wordt ingevuld | `app/lib/offerte/berichten.ts`, `app/lib/factuur/berichten.ts`, `app/lib/werkgebied/afwijzingsmail.ts`, `app/lib/offerte/gegevens.ts` (`{termijn}`), `app/portaal/[slug]/calculator.tsx` en `engine-calculator.tsx` (`{bedrijfsnaam}`), `app/lib/lead-voortgang.ts` (`{n}`) |

Alle plekken roepen `renderTemplate` aan; een losse `.replace()` op een sjabloon is niet toegestaan.

## Een variabele toevoegen

1. Eén item in `VARIABELEN` (`key`, `label`, `voorbeeld`, `groep`, `contexten`, `uitleg`).
2. De waarde meegeven op de plek waar het bericht wordt ingevuld (bijv. `BerichtWaarden`).
3. `npm test`: `variabelen.test.ts` controleert dat elke variabele in elke context een waarde krijgt en dat alle standaardteksten alleen bekende variabelen gebruiken.

## Gedrag

- Onbekend of in dit bericht niet beschikbaar (bijv. `{vervaldatum}` in een offertebericht): grijs gestippeld blokje met ⚠ en een waarschuwing; de tekst blijft staan. In het uiteindelijke bericht wordt het leeg (nooit "undefined").
- Ontbreekt een verplichte variabele (bijv. `{link}` in een factuurbericht), dan volgt een niet-blokkerende waarschuwing.
- Plakken is altijd platte tekst; kopiëren geeft de `{sleutel}`-vorm.
- Op een telefoon is slepen onbetrouwbaar: tikken op een blokje voegt het in op de plek van de cursor (of aan het eind).

## Tests

- `app/lib/sjabloon/*.test.ts`: renderen, onbekende/ontbrekende waarden, speciale tekens, invoegen/verplaatsen/verwijderen op begin/midden/eind, alle tokens van alle standaardteksten.
- `e2e/bericht-editor.spec.ts`: blokjes uit een bestaande tekst, tikken, toetsenbord, slepen met drop-indicator, plakken/kopiëren, 360/390/430 px, factuur- en afwijzingscontext.
