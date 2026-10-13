
## GitHub-issues (P0 en P1)

| # | Prio | Gebied | Titel |
|---|---|---|---|
| [#67](https://github.com/GymWiki/Kostenplan/issues/67) | P0 | security | `registreerBetalingAction`: betaling registreren op een factuur van een ander bedrijf (**staat in productie sinds #66**) |
| [#68](https://github.com/GymWiki/Kostenplan/issues/68) | P0 | bug | Factuur-editor mobiel: "Definitief maken" en "Versturen" achter de tabbalk |
| [#69](https://github.com/GymWiki/Kostenplan/issues/69) | P0 | bug | Offerte: stille overschrijving bij twee tabbladen |
| [#70](https://github.com/GymWiki/Kostenplan/issues/70) | P0 | bug | Offerte: prijs "12.50" wordt 1.250,00 |
| [#71](https://github.com/GymWiki/Kostenplan/issues/71) | P0 | bug | Offerte: offline bewerken blijft "Opslaan…" en gaat verloren |
| [#72](https://github.com/GymWiki/Kostenplan/issues/72) | P1 | bug | Overnemen na registreren vanuit /probeer: 500 (Prisma-transactie) |
| [#73](https://github.com/GymWiki/Kostenplan/issues/73) | P1 | a11y | Focus lekt uit dialogen en bottom sheets |
| [#74](https://github.com/GymWiki/Kostenplan/issues/74) | P1 | pricing | Gekozen optionele regel telt niet mee in beheerscherm en gewone PDF |
| [#75](https://github.com/GymWiki/Kostenplan/issues/75) | P1 | bug | /probeer mobiel: tarief-stap wordt overgeslagen |
| [#76](https://github.com/GymWiki/Kostenplan/issues/76) | P1 | document | Factuur: aantal × prijs ≠ regeltotaal |
| [#77](https://github.com/GymWiki/Kostenplan/issues/77) | P1 | bug | Betaling met punt als decimaalteken wordt geweigerd |
| [#78](https://github.com/GymWiki/Kostenplan/issues/78) | P1 | ux | Definitieve factuur toont "✓ Verstuurd" zonder bevestiging |

## Voorstel voor de volgorde van fixen

1. **#67 (hotfix, vandaag)**: companyId-controle in `registreerBetaling`. Staat in productie; een kleine, afgebakende wijziging met een databasetest en een e2e-test.
2. **#72 (conversie)**: elke nieuwe gebruiker die via /probeer registreert verliest zijn rekentool. Eén regel (slug vóór de transactie), met een databasetest op een pool van één verbinding.
3. **#70 + #77 samen**: één gedeelde, geteste bedrag-parser voor de offerte-editor en het betalingsformulier; lost een P0 en een P1 op.
4. **#68 + #78 (mobiele factuurflow, klein)**: `verbergtTabbalk()` aanvullen en de echte status tonen in plaats van de vaste tekst "Verstuurd". Combineer met de kopupdate na "Definitief maken" (P2).
5. **#71 + #69 (opslagrobuustheid van de editor)**: foutafhandeling met "Niet opgeslagen / Opnieuw proberen", herstel bij `online`, en optimistic locking (versie/`updatedAt`) voor offertes en facturen.
6. **#74 + #76 (bedragen op documenten)**: gekozen opties meetellen na akkoord in editor en gewone PDF; aantal × prijs = regeltotaal op de factuur. Beide met rekentests; draai daarna de `pricing-checker` en `document-checker` opnieuw.
7. **#75** (tarief-stap op /probeer, `key` per knopvariant) en **#73** (focusbeheer in `Overlay`, helpt alle sheets).
8. Daarna de P2/P3-clusters: tijdzone (`timeZone: "Europe/Amsterdam"` in alle datumformatters verhelpt de React-hydratiefout #418/#419 op leads, offertes en facturen, zie de bevindingen van verifier-02 en verifier-08), Engelse zod-meldingen in de UI vervangen, copy-correcties (onderdelen/items, "1 onderdelen", "1 d te laat", placeholders, de TODO-tekst in Offerte-instellingen), label-in-naam op de bedrijfswisselaar, contrast van "Kostencalculator van" en paginanummer.

## Bijzonderheden van deze ronde

- **Seed-artefacten** (door de verifiers als zodanig verworpen): kunstmatige lead-snapshots, seed-offertes zonder `pdfData`, Groenstijl-afzender (inmiddels in de seed gecorrigeerd), afstandsverschil door de nep-PDOK.
- **Dekking**: de agents hebben de hoofdroutes 1–7, drie personas, UI op 4 breedtes, a11y desktop en mobiel, copy, edge-cases (twee rondes), prijzen (embed → lead → offerte-PDF), documenten, beveiliging en prestaties doorlopen. Niet gedekt: factuur-PDF in de pricing-keten (de versturen-stap blokkeerde), het meerdere zones/postcodes-werkgebied, de afwijzingsmail, echte Slow 3G (throttling werkt niet met de gebruikte aanpak), de gebruiker `nieuw` op lege toestanden en de offerte-/factuur-deeldialoog met echte mail/WhatsApp.
- **Prestaties**: Lighthouse mobiel (lokale build) landing 93, /probeer 92, embed 86, Overzicht 84–90 met LCP 3,6–4,3 s (drempel 4 s; onzeker, meting door andere agents verstoord); alle gemeten kliks < 100 ms.
- **Vaste e2e-basis** (`npm run test:e2e`): de axe-tests en de test "definitief maken is geblokkeerd…" op mobiel falen nog; dat zijn dezelfde bevindingen (label-in-naam, contrast, onbereikbare knop). Zet ze na het fixen vast.
