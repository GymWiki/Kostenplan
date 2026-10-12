# Offerte v2

Professionele, juridisch correcte offertes vanuit een lead: A4-document met logo en huisstijl, echte vector-PDF, delen via de eigen mail of app van de hovenier, online akkoord met audittrail. De offertefunctie heeft geen omgevingsvariabelen nodig (geen `BREVO_API_KEY`, geen `CRON_SECRET`). Audit en keuzes: `audit.md`.

## Wat er is gebouwd

| Fase | Inhoud | Waar |
|---|---|---|
| 1 | Offertegegevens in Profiel (KvK, btw-id/KOR, IBAN, statutaire gegevens bij bv/nv, contactpersoon, algemene voorwaarden-upload, standaarden: nummering, geldigheid, betaalvoorwaarden, teksten, voorwaardenblokken, herroeping, btw per regeltype, berichtteksten voor delen en herinneren), wizard met alleen ontbrekende velden en live briefpapier | `app/dashboard/profiel/offertegegevens-formulier.tsx`, `app/components/offerte/gegevens-wizard.tsx`, `app/lib/offerte/gegevens*.ts`, `validatie.ts` |
| 2 | Datamodel in centen, btw per regel (21/9/0, configuratie), KOR, korting, stelpost/optioneel/tekstregel, versies met vergrendeling, atomaire nummering | `prisma/schema.prisma` (OfferteV2, OfferteVersie, OfferteAkkoord, OfferteGebeurtenis, …), `app/lib/offerte/{model,bereken,opslag,nummer,status}.ts` |
| 3 | Offerte uit lead met losse regels (materiaal, arbeid, transport, voorrijkosten, extra's); opbouw wordt nu in de lead-snapshot bewaard; €0-bug en restpost verholpen | `app/lib/offerte/uit-lead.ts`, `app/lib/lead-snapshot.ts`, `app/lib/calculate.ts` |
| 4 | Editor: desktop (document + paneel, klikken = bewerken, inline tekst/aantal, slepen/pijlen via paneel, standaardregels, autosave) en mobiel (blokken + bottom sheets, Bewerken/Voorbeeld) | `app/components/offerte/offerte-editor-v2.tsx`, `offerte-paneel.tsx` |
| 5 | A4-document (één component voor scherm en PDF), PDF via headless Chromium | `offerte-document.tsx`, `offerte-css.ts`, `app/lib/offerte/pdf.ts`, `app/offerte-print/[token]` |
| 6 | Versturen via de eigen mail/app: eerst de controle (blokkerend/waarschuwingen, ook server-side), dan de PDF klaarzetten en delen. Mobiel: deelmenu van het toestel met de PDF als bijlage (Web Share API met bestanden; anders alleen tekst + link). Desktop: `mailto:` naar de klant met onderwerp "Offerte 2026-0012 – onderwerp", tekst en link naar de online offerte, plus PDF downloaden, link kopiëren en WhatsApp. Het bericht is aanpasbaar (standaardtekst in Profiel). Daarna de vraag "Is de offerte verstuurd?": pas bij Ja wordt de status Verstuurd en de versie vergrendeld. | `controle.ts`, `deel-dialoog.tsx`, `berichten.ts`, `app/lib/actions/offerte-v2.ts` |
| 7 | Online offerte `/o/[token]`: optionele regels, akkoord (naam, tijdstip, IP, user-agent, versie, hash van de PDF), getekende PDF direct te downloaden op de bevestigingspagina (de hovenier vindt hem bij de lead), vraag, afwijzen, verlopen, nieuwere versie. Geen mails. | `app/o/[token]`, `app/lib/actions/offerte-publiek.ts` |
| 8 | Offertestatus en filter in Leads. Geen cronjob: "Verlopen" wordt afgeleid uit geldig-tot en de datum van vandaag (Europe/Amsterdam) overal waar de offerte getoond of geaccepteerd wordt; akkoord na verloop wordt server-side geweigerd. Herinneringen zijn een tip (Overzicht en Leads: binnen 3 dagen voor verval of 7 dagen zonder reactie) die dezelfde deelflow opent met herinneringstekst. Meldingen aan de hovenier (bekeken, akkoord, vraag, afwijzing): badge op Leads, melding in Overzicht en push als dat is ingesteld; geen e-mail. | `app/dashboard/leads/*`, `app/lib/offerte/{status,tips,meldingen}.ts`, `app/components/dashboard/offerte-tips.tsx` |

Bestaande (oude) offertes blijven ongewijzigd bekijkbaar en bewerkbaar; nieuwe offertes gebruiken de nieuwe tabellen.

## Keuzes en afwijkingen (graag even lezen)

- **PDF via Chromium die de printpagina van de app opent** (`/offerte-print/[token]`, ondertekende token van 3 minuten) in plaats van HTML-naar-string, omdat `react-dom/server` in de server-laag van Next niet mag. Gevolg: de PDF gebruikt exact dezelfde component, CSS en (next/font) lettertypes als het scherm. De voettekst per pagina komt uit Chromium's footer-template en heeft daardoor Arial i.p.v. het huisstijllettertype.
- **PDF's staan als bytes in de database** (`OfferteVersie.pdfData`, `OfferteAkkoord.getekendePdfData`) in plaats van in Supabase Storage: de klant is anoniem en er is geen service-role-sleutel, dus uploaden vanuit de publieke akkoord-flow kan niet. De SHA-256 hiervan staat in het akkoord.
- **Voorrijkosten en transport**: de rekentool rekent die per onderdeel. De offerte toont ze als één regel per soort ("Voorrijkosten (2 onderdelen)") met hetzelfde totaalbedrag, zodat het offertetotaal gelijk blijft aan wat de klant zag. Wil je dat ze echt één keer per offerte gelden, dan moet de rekentool zelf worden aangepast.
- **Btw voor planten 9%** is de standaard voor regels waarvan de naam op planten wijst (haag, boom, struik…); alles anders 21%. Daardoor kan het offertetotaal bij plantenregels lager zijn dan in de rekentool. Aan te passen per bedrijf (Profiel) en per regel.
- **Totaal gelijk aan rekentool**: tot op enkele centen (afronding per regel); de tests staan op ≤ 5 cent.
- **Arbeid in dagdelen** wordt bewaard met 4 decimalen en weergegeven met 2.
- **Herroepingstekst**: `TODO(Pieter): juridisch laten checken` (`app/lib/offerte/gegevens.ts`).
- Het woord "werkzaamheid" komt volgens de copyregel niet voor in de UI-teksten (ook niet in de offerteteksten).

## Controle (resultaten)

1. €0-test en totaal = rekentool voor alle rekenmethodes, meerdere materiaalcategorieën, stapgrootte, extra's, bandbreedte, artikelregels: `app/lib/offerte/uit-lead.test.ts`.
2. Btw (gemengd, KOR, korting, optioneel, stelpost, afronding): `bereken.test.ts`.
3. Voorbeeld-PDF's: `pdf/` (particulier 9% + 21%, zakelijk excl. btw, KOR, meerdere pagina's met herhaalde tabelkop, getekende versie).
4. Versturen onmogelijk zonder KvK of met €0-regel: `controle.test.ts` (alle blokkades), UI-bewijs in `schermen/m4-controle-0-regel-412.png`; de server herhaalt de controle in `maakDeelklaarAction`.
5. Delen (Android/iOS-emulatie met nagebootste Web Share, desktop-mailto), akkoord op mobiel, audittrail, getekende PDF zonder mails, verlopen offerte, herinneringstip: `npm run test:offerte-e2e` (zonder `BREVO_API_KEY` en `CRON_SECRET`), resultaten in `schermen/resultaten.json` (24/24) en `resultaten-mobiel.json`.
6. Na akkoord vergrendeld; wijzigen na versturen = nieuwe versie: `opslag.test.ts` (database) en de E2E.
7. Unieke nummers bij gelijktijdige aanvragen: `nummer.test.ts` en `opslag.test.ts` (50 en 20 parallelle aanvragen; draai met `TEST_DATABASE_URL`).
8. Scherm naast PDF: `schermen/vergelijking-scherm-pdf.png`.

## Niet getest

- De PDF-generatie met `@sparticuz/chromium` op Vercel zelf (lokaal getest met de aanwezige Chromium). Gaat het daar mis, dan krijg je bij versturen een duidelijke foutmelding en wordt er niets verstuurd.
- Het echte deelmenu van een fysiek toestel (getest met een nagebootste `navigator.share`/`canShare`).
- Web Push voor de meldingen (alleen als VAPID is ingesteld, zoals bij nieuwe leads).
