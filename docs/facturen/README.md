# Facturen

Facturen en creditnota's vanuit de offerte, met dezelfde editor, hetzelfde A4-document, dezelfde PDF- en deelflow. Geen nieuwe externe diensten, geen cronjob, geen nieuwe omgevingsvariabelen.

## Wat is er gebouwd

| Fase | Inhoud | Waar |
|---|---|---|
| F1 | Datamodel (Factuur, betalingen, gebeurtenissen, nummerteller), doorlopende nummering per bedrijf/reeks/jaar in de transactie van "Definitief maken", onveranderlijk via databasetriggers, PDF eenmalig met SHA-256 | `prisma/migrations/20261019090000_facturen`, `app/lib/factuur/{opslag,nummer}.ts` |
| F2 | Factuur uit offerte: één factuur, termijnfacturen, eindfactuur met "Reeds gefactureerd: F2026-0004", stelposten "Te bepalen bij nacalculatie", meerwerk, losse factuur, creditnota. Totalen via dezelfde `berekenTotalen` als de offerte | `app/lib/factuur/maak.ts`, `app/lib/actions/facturen.ts` |
| F3 | Editor (hergebruik `OfferteEditorV2`) en A4-document (titel Factuur/Creditnota, metablok, "Concept – nog geen nummer", betaalblok, voettekst, KOR, btw verlegd) | `offerte-document.tsx`, `app/components/factuur/*` |
| F4 | Definitief maken met controle (KvK, btw-id behalve KOR, adres, IBAN, ook server-side), delen (Web Share/mailto/WhatsApp/link), "Is de factuur verstuurd?", online factuur `/f/[token]` met PDF, kopieerknoppen en "bekeken" | `app/lib/actions/facturen-versturen.ts`, `app/f/[token]` |
| F5 | Deelbetalingen, status Deels betaald/Betaald/Gecrediteerd, "te laat" afgeleid (Europe/Amsterdam), herinnering → aanmaning → laatste herinnering (14 dagen, alleen particulieren), creditnota geheel of per regel, tijdlijn | `app/lib/factuur/{beheer,betaling}.ts`, `app/components/factuur/factuur-beheer.tsx` |
| F6 | Fase van een lead afgeleid uit offerte, facturen en handmatige stappen (Nieuw → In contact → Offerte verstuurd → Akkoord → Ingepland → Opgeleverd → Gefactureerd → Betaald; zijpaden Offerte verlopen, Afgewezen, Verloren met reden), voortgangsbalk, tijdlijn, één volgende actie, filterchips met aantallen, tellers en meldingen in Overzicht | `app/lib/lead-fase.ts`, `lead-voortgang.ts`, `app/dashboard/leads/*`, `app/components/dashboard/factuur-tellers.tsx` |
| F7 | `/dashboard/facturen` (filters op periode/status/zoeken), export CSV (btw per tarief, betaald, openstaand), ZIP met PDF's en optioneel UBL 2.1, melding dat Kostenplan geen boekhoudpakket is; een bedrijf met facturen kan pas worden verwijderd na een volledige export | `app/api/facturen/export`, `app/lib/factuur/export*.ts` |

## Keuzes en afwijkingen

- **Chips-definities**: Nieuw = fase Nieuw; Offerte = In contact of Offerte verstuurd; Akkoord = Akkoord, Ingepland of Opgeleverd; Te factureren = akkoord maar nog geen definitieve (eind)factuur (een aanbetaling alleen telt niet als gefactureerd); Openstaand = er staat nog iets open; Te laat = vervaldatum verstreken; Afgerond = Betaald, Verloren, Afgewezen of Offerte verlopen. Chips kunnen overlappen.
- **Mobiel "Open"** in de leadlijst is nu fase-gebaseerd (alles wat nog loopt), zodat leads met een akkoord of openstaande factuur niet verdwijnen.
- **Desktopbord** (optioneel in de opdracht): niet gebouwd; het bord blijft op de bestaande statuskolommen.
- **Herinneringsteksten voor particulieren** ("Laatste herinnering (14 dagen)"): `TODO(Pieter): juridisch laten checken`.
- **UBL** is een basis-UBL 2.1 voor import in boekhoudpakketten, niet gevalideerd voor Peppol.
- **Bedrijf verwijderen**: de export (`/api/facturen/export?formaat=zip`) zonder periode zet `Company.factuurExportOp`; facturen die daarna definitief worden maken een nieuwe export nodig. De databasetrigger laat een cascade alleen toe als de bedrijfsrij zelf wordt verwijderd.

## Controle (resultaten)

1. Unit- en databasetests: `app/lib/factuur/*.test.ts` (btw 9/21, KOR, verlegd, termijnen + eind met aftrek, meerwerk, stelposten, deelbetalingen, creditnota geheel/deels, export), `app/lib/lead-fase.test.ts`.
2. 50 gelijktijdige "definitief maken" → 50 unieke, aaneengesloten nummers; verwijderde concepten en mislukte pogingen geven geen gaten: `opslag.test.ts` (met `TEST_DATABASE_URL`).
3. Een definitieve factuur is niet te wijzigen of te verwijderen, ook niet met directe SQL: `opslag.test.ts` en de e2e.
4. Voorbeeld-PDF's: `pdf/` (particulier 9% + 21%, zakelijk btw verlegd, KOR, aanbetaling 30%, eindfactuur met aftrek, creditnota, meerdere pagina's). Maken: `scripts/mobile-ux/factuur-voorbeeld-pdfs.ts`.
5. Definitief maken zonder KvK/btw-id/adres/IBAN is onmogelijk, de link wijst naar precies dat veld: `controle.ts`, `maak.test.ts`, e2e.
6. Fasen van het volledige pad en de zijpaden, inclusief tijdlijn: `lead-fase.test.ts` en e2e (In contact, Verloren met reden).
7. Export-CSV is gelijk aan de som van de facturen: `export.test.ts` en e2e.
8. E2E op de draaiende app (412 × 915 en 1440): `node scripts/mobile-ux/facturen-controle.js docs/facturen/schermen` → 56/56 (`controle-resultaten.json`). Schermafbeeldingen in `schermen/`.
