# Landingspagina — ontwerpkaders

De lezer is de hovenier als ondernemer. Alles spreekt hem aan als vakman: tijd, marge,
betere aanvragen, een professionele uitstraling naar zijn klanten.

## Definitiezin (overal gelijk: metadata, Organization-schema, footer, `/llms.txt`)

> Kostenplan is een online rekentool voor hoveniers in Nederland waarmee klanten op de
> website van de hovenier zelf de prijs van bijvoorbeeld een schutting, terras of gazon
> berekenen en een aanvraag versturen.

(Bron in code: `app/lib/landing/feiten.ts` → `DEFINITIE`.)

## Kopregel

**"Je klant weet de prijs al voordat hij belt."** Gekozen omdat het in vijf seconden het
resultaat (betere aanvragen, minder telefoontjes) en de plek van het product (vóór het
eerste contact) noemt, in de taal van de vakman. De andere richtingen beloven tijd of
omzet zonder iets over het product te zeggen.

## Uitstraling

Rustig, precies, zelfverzekerd; veel lucht, sterke typografie, het product als hoofdbeeld.
Licht thema. Eén vormtaal: **de werktekening** — maatlijnen met pijlpunten en
maatlabels in mono. Ze meten koppen, productweergaven en de tabel "in", en tekenen zich
bij het laden uit rond de demo (het ene georkestreerde moment). Verder: lijnen i.p.v.
schaduwen, vlakken i.p.v. kaartjes.

## Tokens (`app/globals.css`, prefix `--lp-`, Tailwind `lp-*`)

| Token | Waarde | Gebruik |
| --- | --- | --- |
| `bos-950` | `#0c2219` | donkere band, telefoonsectie |
| `bos-900` / `800` / `700` | `#123425` / `#1a4a35` / `#24634a` | hoofdgroen (diep, eigen), koppen op licht, vlakken |
| `bos-100` | `#dfe9e1` | lichte groene vlakken |
| `papier` / `papier-2` | `#f3f4ee` / `#e9ebe2` | pagina / wisselvlak (warm neutraal, groene ondertoon) |
| `staal` | `#e3e9e8` | koel neutraal (documenten, beheerweergave) |
| `lijn` / `rand` | `#cfd5c8` / `#76827a` | scheidingslijnen / invoerranden (≥ 3:1) |
| `inkt` / `inkt-2` | `#13201a` / `#46534b` | tekst / gedempte tekst |
| `oker` / `oker-donker` / `oker-licht` | `#c8962f` / `#7d5a10` / `#e6bf6a` | **enige accent**: prijzen en primaire CTA |

Contrast (berekend): inkt/papier 15,2 · inkt-2/papier 7,3 · inkt-2/papier-2 6,7 ·
oker-donker/papier 5,7 · inkt op oker 6,3 · papier op bos-800 9,2 · oker-licht op bos-950 9,6.
Alles ≥ AA.

## Typografie (`next/font`)

- **Archivo** (variabel, as `wdth`) voor koppen: brede, bouwkundige letter, past bij
  werktekeningen. Niet Inter/Space Grotesk, geen serif.
- **IBM Plex Sans** voor lopende tekst (degelijk, goed leesbaar).
- **IBM Plex Mono** alleen voor maatlabels en getallen in tekeningen.
- Prijzen en getallen: `tabular-nums`.

## Beeld

Geen foto's. Het beeld is: de echte klant-rekentool (live gerenderd), presentatie-
componenten voor aanvraag en conceptofferte, getallen en prijzen, en SVG-tekeningen in
werktekening-stijl. Materiaalstalen (klinker, hout, gras, …) in CSS, alleen in de
werkzaamheden-tabel. Het product staat altijd in de context van de hovenier ("jouw
website", "jouw aanvragen", "jouw prijzen"). Fictieve bedrijven zijn als voorbeeld
gemarkeerd.

## Sectievormen (geen twee gelijk)

1. Hero — gesplitst scherm, echte rekentool in maatkader, schakelaar klant/beheer
2. Probleem — editorial, grote typografie, asymmetrisch, twee schuifregelaars
3. Zo werkt het — sticky-scroll: beeld blijft staan terwijl de stap doorscrolt (CSS-only)
4. Huisstijl — voor/na-schuif met drie fictieve bedrijven
5. Aanvragen — breed en compact: inbox-regel + werkbon + conceptofferte
6. Klantervaring — donkere band met telefoon en tijdlijn
7. Werkzaamheden — bestek-/materiaallijst als tabel met maatvoering
8. Vertrouwen — rustig, groot citaat (of feiten als er geen testimonial is)
9. Prijzen — vergelijkingstabel met maand/jaar-schakelaar (CSS-only)
10. Vragen — tweekoloms, vraag links, antwoord rechts
11. Afsluiter — brede, rustige band in de accentkleur

## Eerlijkheid over abonnementen

Eigen huisstijl, aanvragen/offertes en insluiten zijn niet Gratis; dat staat in de
prijstabel en in de tekst bij de betreffende secties. "Op je website" werkt met een
link voor alle pakketten en met insluiten (iframe) in Pro.

## Beweging

Eén tekenmoment (maatlijnen rond de demo bij het laden, CSS `stroke-dashoffset`) en
subtiele overgangen bij interactie. Geen scroll-jacking, niets blijft verborgen tot je
scrolt, `prefers-reduced-motion` schakelt het uit. Geen animatiebibliotheek.

## Controle (fase 5)

Gemeten op een lokale productiebuild met Lighthouse 12, mobiel, gesimuleerde throttling
(3 runs): Performance 95–96 · Accessibility 100 · Best Practices 100 · SEO 100 ·
CLS 0 · TBT 120–160 ms · **LCP 2,6 s** (kopregel; doel < 2,5 s, dus 0,1 s te hoog in
de simulatie). Basislijn van de oude pagina: 94 / 97 / 100 / 100, LCP 2,9 s.
Schermafbeeldingen per sectie: `docs/landing-screens/` (desktop 1440 px en mobiel 390 px).

Open `TODO(Pieter)`: `app/lib/landing/testimonials.ts` (testimonials),
`app/components/landing/landing-schema.tsx` (`sameAs`), en de voorbeeldprijzen en
werktempo's in `app/lib/presets/hovenier.ts` (die de demo's gebruiken).

## Herontwerp: moderne uitstraling (inhoud ongewijzigd)

Alleen de vormgeving is vernieuwd; alle teksten zijn gelijk gebleven.
- **Vormtaal:** lichte randen (1 px) en groen getinte schaduwen in plaats van harde inktranden; containers 24 px, bedieningselementen 12 px, knoppen en schakelaars als pil. Secties staan als ingezette, afgeronde vlakken op de pagina.
- **Typografie:** één lettertype, Geist (koppen en tekst, strakke tracking), plus Geist Mono voor maatlabels. Archivo Black en IBM Plex zijn vervallen.
- **Header:** zwevende glazen pil met effen terugval (`prefers-reduced-transparency`).
- **Labels:** sectielabels zijn kleine genummerde bolletjes in gewone letters, geen hoofdletter-eyebrows.
- **Beweging:** hero-onderdelen schuiven rustig binnen; scroll-onthulling (`lp-onthul`) werkt alleen waar de browser `animation-timeline: view()` kent en laat de inhoud anders gewoon staan.
- **Bewust niet overgenomen uit de taste-skill:** foto's en stockbeeld (jouw regel: geen foto's), em-dashes in de teksten (inhoud blijft ongewijzigd), dark mode (licht thema volstaat), de ene donkere telefoonband blijft (jouw opdracht voor sectie 6).

## Kleurcorrectie: groen is het merk

Kritische blik: de pagina las als crème met oker; groen zat vooral in donkere vlakken en oker (messing-familie) droeg de hoofdknoppen. Voor hoveniers moet groen het merk zijn.
- **Groen domineert:** bosgroen `#1f6b3e`/`#17512f` voor hoofdknoppen, schakelaars en de afsluiterband; neutralen zijn nu groen getint (`#f3f7f2`, `#e8efe6`, `#dfe9e4`) in plaats van warm crème.
- **Oker is alleen nog accent:** de knop op de groene afsluiterband, kleine labels ("Nieuw", "voorbeeld"), de schuifregelaar. Linkonderstrepingen en positienummers zijn groen.
- Contrast opnieuw berekend: wit op `#1f6b3e` 6,5 · inkt-2 op papier 7,5 · inkt op oker 6,1 · papier op bos-950 14,0.
