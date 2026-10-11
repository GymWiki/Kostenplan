# Embed-weerbaarheid

Doel: de rekentool op de website van een hovenier blijft bruikbaar als onze
database, onze app of onze e-mailleverancier uitvalt, en vertraagt of breekt
de website van de hovenier nooit.

Dit document begint met de audit (Fase 0) en wordt per fase aangevuld.

## Fase 0 — Audit van de situatie vóór deze wijziging

### Wat de hovenier op zijn site plakt

`getToolEmbedCode()` (`app/lib/url.ts`) levert een `<iframe>` naar
`https://<app>/embed/<toolId>` plus een klein `<script>` dat de hoogte van de
iframe aanpast via `postMessage("kostenplan:resize")`.

Belangrijk, en anders dan de opdracht veronderstelde:

- Er is **geen** losse script-bundel of Shadow DOM: de embed is een iframe
  naar een server-gerenderde Next.js-pagina.
- Er is **geen** `@vercel/blob` en **geen** e-mailverzending (geen Brevo of
  andere mailcode): een lead wordt alleen in de database bewaard en de
  hovenier ziet hem in het dashboard.

### Verzoeken en domeinen bij het laden van de embed

| Stap | Domein | Wat | Bij uitval |
|---|---|---|---|
| 1 | website hovenier | pagina met iframe + resize-script | n.v.t. |
| 2 | app (Vercel) | `GET /embed/<toolId>` | iframe leeg / foutpagina |
| 2a | app (proxy) | `proxy.ts` roept `supabase.auth.getUser()` aan voor elk pad dat niet is vrijgesteld, óók `/embed/*` | traag of fout als Supabase Auth traag is |
| 2b | database | `getToolForEmbed()`: Tool + bedrijf + branding + kosten + producten + materialen (Prisma, 1 query-boom) | **500**: de pagina is stuk als de database stuk is |
| 3 | app (Vercel) | JS-chunks `/_next/static/...` | rekentool is een lege pagina |
| 4 | Supabase Storage | logo, materiaalfoto's | afbeelding ontbreekt |
| 5 | app | server action `createLeadAction` bij versturen | aanvraag verloren, foutmelding |
| 6 | app | `recordPublicAnalyticsEventAction` (analytics) | geen gevolgen voor de bezoeker mag het hebben |

### Rekent de tool client-side?

Ja. De rekenlogica (`app/lib/calculate.ts`, `sjablonen.ts`,
`calculator-engine/*`) is pure TypeScript die in de browser draait. De server
levert alleen de configuratie (producten, prijzen, tarieven, thema). Daarmee
is een bevroren kopie van die configuratie voldoende om te kunnen rekenen.

### Hoe komt een lead binnen?

1. Client: `Calculator` → `useActionState(createLeadAction)`.
2. Server action `createLeadAction` (`app/lib/actions/leads.ts`): valideert
   (zod), haalt de tool op (database) en schrijft `Lead` + de door de client
   meegestuurde prijs-snapshot (de server rekent niet opnieuw na).
3. Opslag: tabel `Lead` (Postgres/Supabase).
4. E-mail: bestaat niet. De hovenier ziet de lead in het dashboard.

### Huidige faalscenario's

| Scenario | Gedrag nu |
|---|---|
| Database onbereikbaar | `/embed/<id>` geeft 500; iframe toont foutpagina of niets |
| Supabase Auth traag | `proxy.ts` wacht op `getUser()` vóór de embed-pagina begint |
| App/Vercel onbereikbaar | iframe blijft leeg; hovenier-site merkt niets maar de bezoeker ziet een wit vlak zonder contactgegevens |
| Lead versturen faalt | foutmelding, ingevulde gegevens blijven in de pagina maar gaan verloren bij sluiten; geen herhaling |
| Dubbel klikken op versturen | kan twee leads opleveren (geen idempotentiesleutel) |
| Layout | iframe-hoogte is pas bekend na de eerste resize; de pagina verspringt |
| Analytics-aanroep faalt | wordt niet expliciet afgevangen |

## Aanpak en bewuste afwijkingen van de opdracht

1. **Iframe blijft**, het is wat bestaande embedcodes gebruiken. We maken de
   iframe-pagina onafhankelijk van de database (snapshot) en zetten er een
   klein laadscript omheen dat time-outs, skeleton en contactkaart regelt.
2. Een volledig Vercel-onafhankelijke rekentool vraagt een aparte
   zelfstandige bundel. Dat is buiten scope; als de app zelf (Vercel) volledig
   onbereikbaar is, krijgt de bezoeker de contactkaart, of — bij een eerder
   bezoek — de laatste kopie uit zijn eigen browser (localStorage) voor de
   gegevens, niet voor de pagina zelf. Dit staat eerlijk in de PR.
3. **E-mail bestaat nog niet.** We bouwen een uitgaande wachtrij (outbox) in
   de database en een optionele Brevo-verzender (`BREVO_API_KEY`). Zonder
   sleutel blijft de lead gewoon in de database staan, zoals nu.
4. **Vercel Blob** is nieuw; zonder `BLOB_READ_WRITE_TOKEN` valt publiceren
   terug op "niet gepubliceerd" en de embed op de database (het huidige
   gedrag), zodat niets stukgaat.

## Fase 1 — Gepubliceerde snapshot (database-onafhankelijke embed)

Wat is er gebouwd:

- `app/lib/snapshot/` — type (`RekentoolSnapshot`), pure bouwfunctie
  (`bouw.ts`, getest), opslag (`opslag.ts`), publicatie (`publiceer.ts`) en
  planning (`plan.ts`).
- Het snapshot-bestand bevat alles om te rekenen en te tonen: producten,
  materialen, prijzen, tarieven (al samengevoegd met de accountstandaarden),
  thema, teksten en alleen de contactgegevens die de hovenier zelf op de
  rekentool toont. Geen bedrijfs-id, geen betaalgegevens, geen
  rij-tijdstempels; het inlog-e-mailadres staat er alleen in als "toon
  e-mailadres" aanstaat. De ids van producten/materialen blijven staan: de
  rekentool gebruikt ze als sleutel.
- Opslag in Vercel Blob (publiek, CDN):
  - `s/<toolId>/v<versie>.json` — onveranderlijk, `max-age` 1 jaar.
  - `s/<toolId>/latest.json` — stabiele verwijzing, `max-age` 60 s.
  Eerst het versiebestand, dan pas `latest`.
- Wanneer wordt er gepubliceerd? Elke schrijfactie via Prisma op Tool,
  Branding, CostSettings, Product, MaterialCategory, MaterialOption,
  ExtraOption, CalculatorConfig of (relevante velden van) Company plant een
  publicatie **na het antwoord** aan de hovenier (`after()`), met 400 ms demping
  en drie pogingen met oplopende wachttijd. Dit zit als Prisma-extensie in
  `app/lib/prisma.ts`, zodat geen enkele bestaande actie kan worden vergeten.
  Opslaan faalt of wacht dus nooit op publiceren.
- Mislukt het publiceren, dan staat `Tool.snapshotVuil` aan. De editor toont dan
  "Nog niet gepubliceerd" met "Opnieuw proberen"; openen van de editor en de
  dagelijkse controle proberen het ook stilletjes opnieuw.
- Inhoud ongewijzigd (zelfde hash) = niet opnieuw schrijven.
- `/embed/<toolId>` leest uitsluitend de snapshot (Blob, anders de
  Cloudflare-spiegel). Alleen als er nog geen snapshot is, valt de pagina terug
  op de database (en publiceert dan meteen). De pagina is 60 s gecachet
  (`revalidate`) en wordt bij elke publicatie direct ververst.
- `proxy.ts` slaat `/embed/*` over: de embed wacht niet meer op Supabase Auth.
- Backfill: `GET /api/cron/snapshots` (met `Authorization: Bearer $CRON_SECRET`)
  publiceert maximaal 20 tools zonder snapshot of met fout per aanroep; de
  migratie zet bestaande tools op "vuil". Vercel Cron draait dit dagelijks
  (`vercel.json`) en roep het na de uitrol handmatig aan tot `resterend: 0`.

Zonder `BLOB_READ_WRITE_TOKEN` gebeurt er niets nieuws: de embed leest uit de
database zoals voorheen.
