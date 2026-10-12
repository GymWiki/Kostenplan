# Offerte v2 — Fase 0: audit

## Hoe de huidige generator werkt

| Onderdeel | Bestand | Opmerking |
|---|---|---|
| Datamodel | `prisma/schema.prisma` → `Offerte` | 1-op-1 met `Lead` (`leadId @unique`), `regels Json` (`OfferteRegel[]`: omschrijving, aantal, eenheid, prijsPerEenheid), één btw-percentage voor de hele offerte (uit `CostSettings`/`Company.standaardBtwPercentage`), status `CONCEPT/VERSTUURD/GEACCEPTEERD/AFGEWEZEN/VERLOPEN/INGETROKKEN`, `deelToken`, `pdfUrl`. Geen versies, geen nummer, geen KvK/btw-id/IBAN, geen secties, geen btw per regel. |
| Regels uit de lead | `app/lib/offertes.ts` → `prefillOfferteRegels` | Eén regel per `LeadSnapshotLine` met `prijs / aantal`. De snapshot bevat per onderdeel alleen het totaalbedrag (`prijs`); materiaal, arbeid, transport en voorrijkosten zijn niet uitgesplitst. |
| Snapshot | `app/portaal/[slug]/calculator.tsx` (`snapshot`), `engine-calculator.tsx` | `LeadSnapshotLine.prijs = breakdown.productRegels[].totaal` (`app/lib/calculate.ts`, `calculateBreakdown`). `ProductRegel` heeft geen opbouw. |
| Editor | `app/dashboard/leads/[leadId]/offerte/offerte-editor.tsx` (733 r.) | Formulier met regels, intro, voorwaarden; voorbeeld in `offerte-preview.tsx`. |
| PDF | `app/lib/offerte-pdf.tsx` | `@react-pdf/renderer` (vector, echte tekst — dus geen screenshot), maar een aparte lay-out ten opzichte van het scherm, standaard Helvetica, zonder bedrijfsgegevens, btw-specificatie, paginanummers of voettekst. Upload naar Supabase Storage (`app/lib/storage.ts`). |
| Versturen / delen | `app/lib/actions/offertes.ts` (`genereerDeelLinkAction`) | Publieke link `/offerte/[token]`; geen e-mail via Brevo met bijlage; klantreactie is een los tekstveld (`klantReactie`). |
| Publieke pagina | `app/offerte/[token]/*` | Akkoord/niet akkoord zonder audittrail. |

## Waar de €0-regel en de restpost ontstaan

1. `prefillOfferteRegels` neemt `lijn.prijs` uit de snapshot. Ontbreekt die (oudere snapshots, of tools via het engine-pad zonder `bedrag`), dan wordt `prijsPerEenheid` **€0**.
2. Het verschil tussen `snapshot.subtotaal` en de som van de regels wordt als één regel **"Materiaal- en overige kosten"** toegevoegd (de "vangnet-restpost").
3. Ook als `prijs` wel aanwezig is, gaan materiaal, arbeid, transport, voorrijkosten en toeslagen op in één bedrag per onderdeel. Er bestaat geen manier om ze als losse regels te tonen, omdat de snapshot de opbouw niet bewaart.

De oorzaak zit dus in het datamodel van de snapshot (alleen een totaal per onderdeel), niet alleen in de omzetting.
Falende test: `app/lib/offerte/uit-lead.test.ts` (importeert `bouwOfferteUitLead`, die er nog niet is).

## Datamodel voor leads en berekeningen (hergebruik)

- `Lead` (snapshot Json, `totaalIndicatie`, `toolId`, `companyId`) blijft de bron. We voegen aan `LeadSnapshotLine` een optionele `opbouw` toe; oude leads blijven geldig (terugval op één regel per onderdeel).
- `CostSettings` (tarieven, btw), `Branding` (logo, kleuren, lettertype), `Company` (naam, `kvkNummer`, `adres`) worden hergebruikt. `Company.kvkNummer` bestaat al maar wordt niet gevalideerd of getoond.
- Bestaande `Offerte`-rijen blijven ongewijzigd en bekijkbaar (oude editor en `/offerte/[token]` blijven werken). Nieuwe offertes gebruiken nieuwe tabellen.

## Keuze PDF-techniek

Opties: (a) dezelfde HTML/React-template voor scherm en PDF via headless Chromium (`playwright-core` + `@sparticuz/chromium`), (b) `@react-pdf/renderer` (al aanwezig).

**Keuze: (a).** Reden: de eis is dat het scherm exact gelijk is aan de PDF. Bij (b) bestaan twee lay-outs (React-DOM voor het scherm en react-pdf-primitieven voor de PDF) die uit elkaar lopen, en de tabel-afbreking, kop/voettekst met "Pagina X van Y" en font-embedding zijn daar beperkter. Met Chromium print dezelfde `OfferteDocument`-component met dezelfde CSS (`@page`, `thead` herhaald, `break-inside: avoid`); voettekst en paginanummering via de Chromium-footertemplate. `@sparticuz/chromium` (~60 MB gecomprimeerd) past binnen de Vercel-functielimiet (250 MB uitgepakt). Lokaal en in tests gebruiken we de aanwezige Chromium (`CHROMIUM_PATH`). Terugval als Chromium niet start: duidelijke foutmelding, de offerte wordt dan niet als verstuurd gemarkeerd.
`@react-pdf/renderer` blijft staan voor de oude offertes tot die bibliotheek niet meer nodig is.

## Plan per fase

Fase 1 offertegegevens (Profiel) · Fase 2 domeinmodel + btw/totalen (puur, getest) · Fase 3 offerte uit lead (+ opbouw in snapshot) · Fase 4 editor · Fase 5 A4-document + PDF · Fase 6 controle + versturen · Fase 7 publieke pagina + akkoord · Fase 8 overzicht, meldingen en herinneringen.
