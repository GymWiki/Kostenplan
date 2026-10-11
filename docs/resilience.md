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
   (zod), haalt de tool op (database), berekent de prijs **opnieuw op de
   server** uit de database-instellingen, schrijft `Lead` + snapshot.
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
