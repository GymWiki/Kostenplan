# Mobiele UX (< 768 px)

Branch `mobile-ux`. Desktop (≥ 768 px) is ongewijzigd; mobiel is een eigen, rustigere weergave
met één ding per scherm en de hoofdactie onder de duim.

## Fase 0 — Audit (vóór)

Schermen en metingen: `voor/390`, `voor/360`, `voor/1440` (`meting.json`). Opzet: productiebuild
tegen een lokale Postgres met testdata en een nep-Supabase-login (`scripts/mobile-ux/`).

Gemeten problemen op 390 px: geen tabbalk (hamburger + zijmenu), tot 20 tikdoelen < 44 px per scherm,
lead-detail met 5 velden/knoppen boven de vouw zonder bel-knop, de editor als paneel van 62 % hoogte,
offerte maken met drie kolommen per regel, /probeer als één lang formulier.

## Wat er gebouwd is

| Fase | Mobiel |
|---|---|
| 1 | Tabbalk onderin (Overzicht · Rekentools · Leads · Profiel, badge nieuwe leads, safe-area, weg bij open toetsenbord), compacte kop die krimpt, `MobieleSheet` (half/volledig, vegen, terug-gebaar, focus-trap), `StickyActiebalk`, `SamenvattingRij`, `Stepper`, `SegmentedControl` |
| 2 | Overzicht wordt **Vandaag**: nieuwe leads, offertes die wachten, checklist, samenvatting, één hoofdknop |
| 3 | Rekentools-lijst met één kaart per tool; rekentool-scherm Bewerken ∣ Voorbeeld, werkzaamheden met samenvatting, "20 m² kost je klant €X", schakelaar "Op je website", snelle sheets Prijzen/Werktempo, volgorde via menu |
| 4 | Werkzaamheid als eigen scherm met accordeon (Basis, Materialen en prijzen, Werktempo, Vaste kosten, optionele blokken), balk "Opbouw voor 20 m²" + Klaar |
| 5 | Leadlijst (filter Nieuw/Open/Alles, ⋯-acties Bellen/WhatsApp/Afgehandeld, omlaag trekken), lead-detail met Bellen/WhatsApp/Offerte maken onderin, offerte maken met regelkaarten + sheet, "Controleren en versturen", "Verder op de computer" |
| 6 | Profiel als gegroepeerde lijst (eigen scherm per rij), /probeer één vraag per scherm met voortgangsbalk |
| 7 | PWA (manifest, iconen, app-schil-service-worker zonder gevoelige data, installatietip na 2e sessie), Web Push bij een nieuwe lead (alleen na tik in Profiel → Meldingen) |

## Afwijkingen

- `start_url` is `/dashboard` (de route `/overzicht` bestaat niet).
- Vegen naar links op een leadrij is niet gebouwd (optioneel extra); de ⋯-knop is er wel.
- Pagina's behouden hun desktopmarkup; mobiel is een tweede weergave in dezelfde pagina (`md:hidden` / `hidden md:…`).
- Echte push naar een telefoon en een echt schermtoetsenbord zijn hier niet te testen; zie Controle.

## Controle

Zie de PR-beschrijving voor de uitkomsten. Opnieuw draaien: `scripts/mobile-ux/start-prod.sh`,
`schermen.js`, `controle.js`, `vergelijk.js`, `lh.sh`.

## Web Push instellen

1. `npx web-push generate-vapid-keys`
2. Vercel → Settings → Environment Variables (Production): `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (publieke sleutel),
   `VAPID_PRIVATE_KEY` (geheime sleutel), `VAPID_SUBJECT` (`mailto:info@kostenplan.nl`). Opnieuw deployen.
3. Migratie `20261014090000_push_abonnementen` uitvoeren.
4. In de app: Profiel → Meldingen → "Meldingen aanzetten". Op iPhone: iOS 16.4+ en eerst Kostenplan op het beginscherm zetten.
Zonder de sleutels is Profiel → Meldingen verborgen en werkt de rest gewoon.
