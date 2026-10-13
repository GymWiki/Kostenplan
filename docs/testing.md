# Testen van Kostenplan.nl

Er zijn twee lagen: een **vaste, deterministische basis** (draait lokaal en in CI) en **testagents** die de app als echte gebruikers doorlopen en bevindingen melden. Niets draait op productie; de e2e-config weigert `kostenplan.nl` als doel.

## Omgeving
Er is geen Docker/`supabase start` nodig of beschikbaar in de sandbox. De testomgeving bestaat uit:

| Onderdeel | Hoe | Poort |
|---|---|---|
| Postgres (lokaal, schema uit `prisma/migrations`) | `scripts/test/reset-db.sh` leegt, migreert en seedt | 5433 |
| Nep-Supabase (auth voor meerdere gebruikers, opslag) | `scripts/test/fake-supabase.js` | 54321 |
| Nep-PDOK (adressen voor het werkgebied) | `scripts/mobile-ux/fake-pdok.js` | 3299 |
| App (productiebuild, `TEST_PAGES=1`, Mollie-testsleutel, `OFFERTE_VOORBEELDEN=1`) | `scripts/test/start-env.sh` | 3200 |

Alles starten: `npm run test:env`. Alleen de data opnieuw zetten: `npm run test:seed`. Wil je liever een Supabase-branch + Vercel-preview gebruiken, zet dan `BASE` en de omgevingsvariabelen daarnaar (nooit de productiedatabase); de seed weigert niet-lokale `DATABASE_URL`'s.

### Testgebruikers (`scripts/test/ids.js`, `scripts/test/seed-test.ts`; ids in `test-results/seed.json`)
| Gebruiker | E-mail | Inhoud |
|---|---|---|
| `a1`, `a2`, `a3` | `hovenier-aN@test.kostenplan.nl` | Hovenier A, Pro, twee bedrijven (De Vries met volledige gegevens, werkgebied Zwolle 30 km met toeslag, minimum €1.500; Groenstijl met KOR). Twee rekentools in het eerste bedrijf (bestrating, schutting, graszoden, kunstgras, boom, haag / onderhoud, vlonder, grondwerk), één in het tweede. Leads in elke fase (nieuw, in contact, offerte concept/verstuurd/verlopen/afgewezen, akkoord, ingepland, opgeleverd, gefactureerd, te laat, betaald, creditnota, verloren, buiten werkgebied), offertes en facturen (concept, verstuurd, te laat, betaald, creditnota). Drie identieke kopieën zodat parallelle tests elkaars data niet raken. |
| `b` | `hovenier-b@test.kostenplan.nl` | Gratis, één rekentool, geen bedrijfsgegevens |
| `nieuw` | `nieuw@test.kostenplan.nl` | Leeg: alleen een inlog, het bedrijf maakt de tester zelf aan |

Wachtwoord voor elke testgebruiker: `Testwachtwoord1!` (de nep-Supabase accepteert elk wachtwoord voor een e-mailadres). Een nieuw e-mailadres kan zich registreren.

`/test-embed?tool=<toolId>&modus=script|iframe` toont de embed op een host-pagina met agressieve CSS (alleen met `TEST_PAGES=1`).

## Vaste basis
| Wat | Commando |
|---|---|
| Unit-, rekenkern- en databasetests (incl. gouden prijsvoorbeelden) | `npm test` (databasetests met `TEST_DATABASE_URL`) |
| e2e op mobiel (412 × 915) en desktop (1440 × 900), met axe-core (serious/critical = falen) en visuele basislijn | `npm run test:e2e` (leegt en seedt eerst) |
| Alleen visuele regressie / basislijn vernieuwen | `npm run test:visueel` / `npm run test:visueel:bijwerken` |
| Lighthouse CI (landing, `/probeer`, embed, Overzicht; drempels in `scripts/test/lighthouse-budget.json`) | `npm run test:lighthouse` |
| Alles | `npm run test:all` |

`AXE_SOFT=1 npm run test:e2e` meldt axe-schendingen zonder te falen. Visuele basislijnen staan in `e2e/__screens__/` (datums en "x dagen geleden" zijn gemaskeerd); na een bedoelde wijziging vernieuw je ze met `test:visueel:bijwerken` en bekijk je de diff in de PR.

## Testagents
Definities: `.claude/agents/*.md` (model haiku, behalve `security-tester` en `verifier`: sonnet). Gemeenschappelijke regels: `docs/test-agents-regels.md`. Draaiboek voor een ronde: `docs/test-agents-ronde.md`. Hulpbibliotheek (echte browser, ingelogd, scherm + console + vondsten): `scripts/test/agent-lib.js`.

| Agent | Taak |
|---|---|
| flow-tester | Eén route per run: probeer → account, rekentool bouwen, embed → aanvraag, lead → offerte → akkoord, termijn/eindfactuur → betaald, werkgebied/minimum, profiel |
| persona-tester | Henk (58, telefoon), Sanne (kantoor, desktop), particulier (mobiel) |
| ui-auditor | Alle schermen op 360/412/768/1440 px |
| a11y-auditor | axe, toetsenbord, focus, contrast, labels, tikdoelen, schermlezernamen |
| copy-auditor | Spelling, begrippen, interne namen, Engels, "werkzaamheid" |
| edge-case-tester | Lege/enorme/negatieve invoer, emoji, dubbelklik, Slow 3G/offline, terug/verversen, twee tabbladen |
| pricing-checker | Zelfde totaal in embed, editor, aanvraag, offerte-PDF en factuur-PDF |
| security-tester | B tegen A, links raden, embed-data, definitieve facturen, werkgebied omzeilen |
| perf-tester | Lighthouse, reactietijd < 100 ms, laadtijd |
| document-checker | Offerte-/factuur-PDF's tegen de wettelijke checklist |
| verifier | Speelt elke melding opnieuw na in een schone sessie, bevestigt/verwerpt, voegt samen, kent prioriteit toe |

Een ronde starten: `npm run test:agents` (zet de omgeving klaar) en laat Claude Code `docs/test-agents-ronde.md` uitvoeren (of `npm run test:agents -- --uitvoeren` met de `claude` CLI). Agents wijzigen **nooit** code en melden alleen wat ze zelf zagen.

### Meldformaat
```json
{ "id": "", "agent": "", "area": "bug|ux|ui|a11y|copy|pricing|security|perf|document",
  "title": "", "url": "", "viewport": "", "user": "", "steps": [], "expected": "", "actual": "",
  "screenshot": "", "console_errors": [], "confidence": 0.0 }
```
De verifier voegt `status` (bevestigd/verworpen/onzeker), `priority`, `merged_ids`, `root_cause_hint` en `repro_script` toe.

### Prioriteiten
- **P0** fout bedrag, dataverlies, beveiliging, blokkade
- **P1** hoofdroute kapot of onduidelijk
- **P2** frictie
- **P3** afwerking

### Rapport
`node scripts/test/rapport.mjs <datum>` → `docs/test-reports/<datum>/` met `report.md`, `findings.json`, `rejected.json`, `screenshots/`. Voor P0 en P1 komt per bevinding een GitHub-issue met labels (prioriteit + gebied).

## Regel: elke gefixte bug krijgt een vaste test
Wie een bevinding fixt, voegt in dezelfde PR een test toe die zonder de fix faalt: een unit-test (rekenkern, pure logica), een databasetest (nummering, onveranderlijkheid) of een e2e-test in `e2e/`. Verwijs in de test naar het issue. Bevindingen die de agents vonden maar die zich niet laten automatiseren, krijgen een regel in het agent-draaiboek.
