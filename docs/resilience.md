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

## Fase 2 — Laadscript, skeleton en contactkaart

Nieuwe embedcode (te kopiëren uit de editor, "Zet op mijn website"):

```html
<div id="kp-<toolId>" class="kostenplan-embed" style="…vaste breedte/min-hoogte…"
  data-kp="<toolId>" data-app="https://…" data-hoogte="600" data-radius="12"
  data-snap="<blob-url>" data-naam="…" data-tel="…" data-mail="…" data-kleur="#…" data-bg="#…"></div>
<script>/* < 2 KB, zie app/lib/embed-code.ts */</script>
```

- Het **inline script** (< 2 KB, getest) laadt `/kp/v1.js` van de app; lukt dat
  niet binnen 4 s (of geeft het een fout), dan van het reserve-adres
  (`NEXT_PUBLIC_EMBED_RESERVE_URL`, niveau 2). Lukt ook dat niet, dan tekent het
  zelf een simpele contactkaart uit de `data-`attributen. Het script is `async`
  en blokkeert de pagina van de hovenier nooit.
- **`/kp/v1.js`** (`public/kp/v1.js`, ~10 KB, onveranderlijk gecachet): maakt een
  skeleton met vaste afmetingen (de plek is gereserveerd: geen verspringing),
  laadt de iframe pas als die bijna in beeld komt (IntersectionObserver), wacht
  maximaal 4 s op `kostenplan:klaar`/`kostenplan:resize`, en toont anders de
  contactkaart ("Bereken je prijs telefonisch of per mail" met Bel/Mail-knoppen
  in de kleuren van de hovenier). Komt de rekentool later alsnog binnen, dan
  vervangt die de kaart weer.
  - Contactgegevens voor de kaart: `data-`attributen → nieuwste uit de
    gepubliceerde kopie (`data-snap`, 2,5 s time-out) → `localStorage`
    (`kp:v1:<toolId>`, maximaal 30 dagen, altijd in try/catch).
  - Geen uncaught errors en geen `console`-uitvoer: alles zit in `try/catch`.
  - Oude codes zonder `data-tel`/`data-mail` krijgen een neutrale melding
    ("Deze rekentool is tijdelijk niet beschikbaar.") i.p.v. een contactkaart.
- **Versies**: een nieuwe loader wordt `v2.js` (nieuw bestand), `LAADSCRIPT_VERSIE`
  in `app/lib/embed-code.ts` bepaalt wat nieuwe codes krijgen. `/kp/*` heeft
  `Cache-Control: public, max-age=31536000, immutable`. Terugdraaien = de
  constante terugzetten; reeds geplakte codes veranderen nooit.
- **Alleen-iframe-variant** voor websitebouwers die scripts verwijderen
  (uitklapbaar in de editor): iframe + verborgen contactkaart die na 4 s
  zichtbaar wordt als de rekentool niet gemeld heeft dat hij geladen is.
- **Embedpagina**: stuurt `kostenplan:klaar` zodra hij geladen is, en
  `error.tsx` stuurt `kostenplan:fout` met een neutrale melding, zodat de kaart
  direct (niet pas na 4 s) verschijnt.
- **Oude codes** (iframe + resize-script) blijven werken: `/embed/<toolId>` en het
  `kostenplan:resize`-bericht zijn ongewijzigd.

## Fase 3 — Aanvragen gaan niet verloren

Browser (`app/lib/lead-client.ts`, hook `useLeadVersturen` in
`app/portaal/[slug]/lead-versturen.tsx`, in beide rekentools):

- Versturen gaat naar `POST /api/embed/lead` met 8 s time-out en maximaal 3
  pogingen (wachttijd 1 s, dan 3 s). Elke aanvraag heeft een sleutel
  (`crypto.randomUUID`) die bij elke poging gelijk blijft.
- Lukt het niet (netwerk, time-out, 5xx), dan gaat — als `NEXT_PUBLIC_LEAD_RESERVE_URL`
  is ingesteld — één poging naar de reserve-route (niveau 2). Daarna wordt
  alleen wat de bezoeker invulde (naam, e-mail, telefoon, de gekozen regels met
  prijsindicatie) in `localStorage` (`kp:leads:v1`, max. 5 stuks, max. 30 dagen,
  altijd in try/catch) bewaard.
- Meteen daarna ziet de bezoeker: **"Je aanvraag is nog niet verstuurd. We
  proberen het automatisch opnieuw."** met **Mail je aanvraag** (mailto met de
  samenvatting in de tekst; alleen als de hovenier zijn e-mailadres toont),
  **Bel ons** (alleen als het telefoonnummer getoond wordt) en de samenvatting
  als kopieerbare tekst.
- De wachtrij wordt geprobeerd bij elk volgend bezoek, zodra de verbinding
  terug is (`online`) en elke 45 s zolang de aanvraag nog wacht. Een tweede
  poging na bewerken vervangt dezelfde wachtrij-regel (zelfde sleutel), dus geen
  dubbele lead.
- Een definitieve afwijzing (400/404: ongeldige invoer, tool weg) haalt de
  aanvraag uit de wachtrij; de browser controleert naam/e-mail vooraf dezelfde
  manier als de server, zodat dat nauwelijks voorkomt.
- Analytics-aanroepen zijn afgevangen (`.catch`) en de server-action zelf
  faalt stil: statistiek kan nooit een fout in de pagina geven.

Server:

- `maakLead()` (`app/lib/lead-aanmaken.ts`) is de ene gedeelde kern (server
  action, `/api/embed/lead` en straks de Cloudflare-ingest). Idempotentie:
  `Lead.idempotentieSleutel` is uniek; een tweede verzoek met dezelfde sleutel
  (ook gelijktijdig, via de unieke index) geeft `ok` zonder tweede lead.
- De lead wordt **eerst** opgeslagen. E-mail volgt daarna uit een outbox
  (`Lead.mailVerzondOp/mailPogingen/mailVolgendePoging/mailFout`):
  `planLeadMail` probeert na het antwoord direct 3 keer (0 s, 3 s, 10 s), daarna
  wachtrij met 2, 4, 8… minuten (max. 6 uur, max. 12 pogingen). De wachtrij
  wordt opgeruimd bij elke nieuwe lead, door de dagelijkse cron en handmatig via
  `GET /api/cron/leadmail`. Zonder `BREVO_API_KEY` wordt er niet gemaild
  (zoals voorheen) en blijft alles gewoon in de database.
- Bestaande leads krijgen in de migratie `mailVerzondOp = createdAt`, zodat er
  niets nagestuurd wordt.

## Fase 4 — Niveau 2: Cloudflare-reserve (optioneel)

Zonder onderstaande instellingen werkt alles op niveau 1 en doet niets hiervan
iets. De code staat in `cloudflare/reserve/` (één Worker + één R2-bucket).

**Wat de reserve doet**

| Route (Worker) | Wat |
|---|---|
| `GET /s/<toolId>/latest.json` en `/v<n>.json` | kopie van de gepubliceerde rekentool (de app leest hieruit als Blob niet antwoordt) |
| `GET /kp/v1.js` | kopie van het laadscript (reserve-bron van het inline script) |
| `PUT /mirror/<toolId>` | de app zet hier bij elke publicatie een kopie neer (token vereist) |
| `POST /lead` | reserve-ingang voor aanvragen: zelfde controles als de app (`app/lib/lead-validatie.ts`, test bewaakt dat het niet soepeler is), limiet 10 per minuut per IP, sleutel = idempotent, max. 64 KB |
| `GET /ingest`, `POST /ingest/ack` | de app haalt wachtende aanvragen op en bevestigt ze pas na opslaan |

De app neemt reserve-aanvragen op via `maakLead()` (idempotente sleutel, dus nooit
dubbel), bij elke geslaagde aanvraag via `/api/embed/lead`, bij het openen van
Leads, in de dagelijkse cron en handmatig via `GET /api/cron/ingest`. Elke
opname staat als `[reserve] …` in de serverlogs.

**Instellen (eenmalig), stap voor stap**

1. Cloudflare-dashboard → **R2 Object Storage** → *Create bucket* → naam
   `kostenplan-reserve`.
2. (Optioneel, voor de limiet per IP) **Storage & Databases → KV** → *Create a
   namespace* `LIMIET`; zet het id in `cloudflare/reserve/wrangler.toml`
   (blok `[[kv_namespaces]]` ontcommentariëren).
3. Lokaal: `npx wrangler login`, dan `npm run cf:deploy` (kopieert eerst de
   laadscripts in de Worker en deployt).
4. Cloudflare-dashboard → **Workers & Pages → kostenplan-reserve → Settings →
   Variables and Secrets** → *Add* (type **Secret**):
   - `MIRROR_TOKEN` = een lange willekeurige tekst
   - `INGEST_TOKEN` = een andere lange willekeurige tekst
5. Noteer de Worker-URL (bijv. `https://kostenplan-reserve.<account>.workers.dev`,
   of koppel een eigen domein onder **Settings → Domains & Routes**).
6. Vercel-dashboard → project → **Settings → Environment Variables** (Production):

   | Naam | Waarde |
   |---|---|
   | `SNAPSHOT_MIRROR_URL` | Worker-URL (zonder `/` aan het eind) |
   | `CF_MIRROR_WRITE_URL` | dezelfde Worker-URL |
   | `CF_MIRROR_TOKEN` | gelijk aan `MIRROR_TOKEN` in Cloudflare |
   | `CF_INGEST_TOKEN` | gelijk aan `INGEST_TOKEN` in Cloudflare |
   | `NEXT_PUBLIC_EMBED_RESERVE_URL` | Worker-URL (reserve-bron voor het laadscript in nieuwe embedcodes) |
   | `NEXT_PUBLIC_LEAD_RESERVE_URL` | Worker-URL + `/lead` |

   Daarna opnieuw deployen. Vervolgens `GET /api/cron/snapshots` laten draaien
   (zie Fase 1) of in de editor iets opslaan: de kopieën worden dan ook
   gespiegeld.
7. Na een nieuwe versie van het laadscript (`public/kp/v2.js`): `npm run cf:deploy`.

**Dagelijkse controle** (`vercel.json` → `/api/cron/snapshots`, 04:17 UTC):
vergelijkt per gepubliceerde rekentool de `inhoudHash` in Blob met die in de
spiegel, publiceert wat achterloopt of mislukt was, verstuurt openstaande
mails en haalt reserve-aanvragen op. Bij een verschil of fout: `[alarm]` in de
logs en — als `ALERT_WEBHOOK_URL` is ingesteld — een bericht naar Slack/
Discord/Better Stack. Elke publicatie spiegelt bovendien meteen; mislukt dat,
dan staat de reden in `Tool.snapshotFout`.

## Fase 5 — Monitoring

`GET /api/health` (publiek, `no-store`, geen details):

```json
{ "ok": true, "db": "ok", "opslag": "ok", "mail": "niet ingesteld" }
```

- `?check=db`, `?check=opslag`, `?check=mail` geven één onderdeel terug en
  antwoorden **503** zodra dat onderdeel `fout` is. Zonder `check`: 503 als één
  van de drie `fout` is. "niet ingesteld" telt niet als fout.
- `opslag` controleert de Blob-API én de publieke CDN (HEAD op een bestaand
  snapshot-bestand); `mail` raadpleegt het Brevo-account.

**Monitors instellen (UptimeRobot of Better Stack)**

Maak deze monitors aan (interval 1–5 minuten, type *HTTP(s)*, verwacht status 200):

| Naam | URL | Opmerking |
|---|---|---|
| Database | `https://<app>/api/health?check=db` | belangrijkste: bij uitval blijft de rekentool werken, maar nieuwe aanvragen niet |
| Opslag | `https://<app>/api/health?check=opslag` | |
| Mail | `https://<app>/api/health?check=mail` | |
| Rekentool in iframe | `https://<app>/embed/<toolId-van-een-testrekentool>` | zoekwoord-check op "Jouw kostenraming" of "Bereken" |
| Testpagina met embedcode | een eigen pagina met de volledige embedcode van een testrekentool | zoekwoord-check op `kostenplan-embed`; controleert ook het laadscript |
| Laadscript | `https://<app>/kp/v1.js` | |
| Reserve (niveau 2) | `https://<worker>/health` | |

**Telefoonmelding**: UptimeRobot → *My Settings → Alert Contacts → Add* →
type *Mobile push* (app) of *SMS/Voice* (betaald); Better Stack →
*On-call → Escalation policy* → bel/push naar je telefoon. Koppel die
contactpersoon aan alle monitors hierboven. Stel *"alert after 2 failed checks"*
in om valse meldingen te beperken.

**Serverlogs** (Vercel → Logs; filter op deze voorvoegsels):
`[snapshot]` publicatiefouten, `[embed]` snapshot via spiegel/database,
`[lead]` opslaan mislukt (bezoeker probeert opnieuw), `[lead-mail]` mail
opnieuw ingepland, `[reserve]` aanvraag uit de reserve opgenomen, `[alarm]`
dagelijkse controle.
