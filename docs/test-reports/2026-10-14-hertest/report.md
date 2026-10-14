# Hertest 2026-10-14

Herhaling van de testronde van 2026-10-13 na PR #79–#87. Vier agents (pricing-checker, document-checker, security-tester, edge-case-tester) op een schone testomgeving (`scripts/test/agents-ronde.sh`). Bewijs: `test-results/hertest/*.md` en `findings-raw/*-hertest.jsonl` (lokaal, niet ingecheckt).

## Per issue

| Issue | Onderwerp | Status | Bewijs |
|---|---|---|---|
| #67 | Betaling op factuur van ander bedrijf | **Opgelost** | Security: 14 server actions direct aangeroepen met ids van bedrijf A als bedrijf B; allemaal `ok:false`, geen rij erbij (psql), zelfde melding voor bestaand en verzonnen id. Audit-extra's F-02…F-07 opgelost (F-07 live getest). |
| #68 / #78 | Mobiele factuurflow, echte status | **Opgelost** | e2e `factuur-mobiel`; geen terugkerende bevinding. |
| #69 / #71 | Opslaan, twee tabbladen | **Opgelost** | Edge: verouderd tabblad op offerte én factuurconcept in beide volgordes → melding + "Nieuwste versie laden", eerste wijziging blijft staan. Offline: "Niet opgeslagen" + "Opnieuw proberen", wijziging overleeft verversen. |
| #70 / #77 | Bedragen/getallen invoeren | **Opgelost** | `12.50`, `1.250,50`, `12,5`, `€ 12,50` → correct; `abc`, `-5` → melding. Betaling `10.50` → € 10,50. Embed: enorme en ongeldige aantallen geven Nederlandse meldingen. |
| #72 | Draft-import transactie | **Opgelost** | DB-test + e2e `probeer-import`. |
| #73 / #75 | Probeer-stappen, focus in dialogen | **Opgelost** | e2e `probeer-stappen`, `focus-dialoog`, axe groen. |
| #74 | Aantal × prijs / bedragen op documenten | **Opgelost** (zie noot 1) | Offerte 2026-0105: optionele regel telt mee in editor, getekende PDF en gewone PDF (€ 4.795,97 incl.). "Totaal excl. btw" staat één keer op alle PDF's. |
| #76 | Documenten: CONCEPT, groet/handtekening, getekende PDF | **Opgelost** | CONCEPT alleen op concept-PDF; groet + handtekening samen; getekende PDF = scherm. |
| Dubbele klik betaling | | **Opgelost** | Eén record € 5,00 (idempotentiesleutel). |

## Nieuwe bevindingen in de hertest

| Bevinding | Oordeel | Actie |
|---|---|---|
| CONCEPT-stempel overlapt afzenderregels (document-checker) | Echt | **Opgelost** in deze PR (stempel staat boven de kop). |
| Factuur "Betaling opslaan" blijft "Opslaan…" na weigering (edge) | Echt, P2 | **Opgelost** in deze PR (eigen bezig-vlag met `finally`). |
| `/api/embed/lead` zonder `rekenkern.invoer`: server herberekent niet, werkgebied/minimum omzeild, verzonnen bedrag opgeslagen (security) | Echt, **P0/hoog** | **Open.** Dit gedrag is bewust (oudere browsers en reserve-ingest sturen geen invoer) en zat niet in #67–#78. Dichtzetten betekent aanvragen zonder invoer weigeren of markeren. Besluit nodig; zie overzicht. |
| Embed `-5` toont geen melding/prijs (edge, conf 0,5) | Klein UX | Open. |
| Offerte-PDF minimumlead: regels incl. btw, totaalblok toont excl. + btw + incl. (pricing) | Geen bug | Ontwerp bij particuliere klant (rekenregel 3); eindtotaal klopt overal (€ 1.500,00). |
| 24 × € 88,87 geeft prijs € 107,53 en totaal € 2.580,72 (document-checker, "niet opgelost") | Geen bug | Rekenregel 3: de getoonde prijs per eenheid × aantal = totaal (24 × 107,53). Excl. is teruggerekend. |
| Rekentool € 4.537,97 vs offerte € 4.537,98 | Bekende afweging | Door rekenregel 3 kan een nieuwe particuliere offerte een cent afwijken. |
| Seed-lead "akkoord": kostenrijen € 3.785,00 vs subtotaal € 3.750,40 | Seed-data | Geen productiecode; open. |
| Akkoordzin noemt bedrag excl. btw (€ 3.995,63) | Tekstkeuze | Open, laag. |
| Klantadres ontbreekt op offerte-PDF (placeholder "Adres klant") | Testlead zonder adres | Geen actie. |

## Niet getest
Zes gouden voorbeelden op alle vijf oppervlakken, afstandstoeslag, btw verlegd (zakelijk), 412×915, trage verbinding, terugknop midden in flow, bouwer-invoer, F-05/F-06 end-to-end.

Noot 1: de document-checker markeerde #74 "niet opgelost" door excl.-bedragen te vergelijken; op de getoonde (incl.) prijzen klopt aantal × prijs = totaal.
