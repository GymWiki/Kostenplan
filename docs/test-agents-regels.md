# Gemeenschappelijke regels voor de testagents

Deze regels gelden voor elke agent in `.claude/agents/`. De hoofdsessie geeft per run mee: de base-URL, de testgebruiker, een stappenbudget en de opdracht.

## Omgeving en browser
- Test **alleen** de lokale testomgeving (standaard `http://localhost:3200`, gestart met `bash scripts/test/start-env.sh`). Nooit productie (`kostenplan.nl`).
- Testdata en ids: `test-results/seed.json`. Testgebruikers: `a1`, `a2`, `a3` (hovenier A, Pro, twee bedrijven, drie identieke kopieën), `b` (Gratis, ontbrekende bedrijfsgegevens), `nieuw` (leeg).
- Gebruik **alleen de testgebruiker die je is toegewezen**; andere agents draaien tegelijk op de andere kopieën.
- Browser: schrijf korte Node-scripts met `scripts/test/agent-lib.js` (Playwright/Chromium, ingelogd als testgebruiker, console- en netwerkfouten verzameld). Start ze met `node <script>` vanuit `/home/user/Kostenplan`. Een Playwright-MCP-server is niet nodig.
  ```js
  const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
  const s = await k.open({ agent: "<jouw-naam>", gebruiker: "a1", viewport: "mobiel", pad: "/dashboard", maxStappen: 150 });
  await s.page.getByRole("link", { name: "Leads" }).click();
  await s.scherm("leads");
  await s.vondst({ area: "ux", title: "…", steps: ["…"], expected: "…", actual: "…", confidence: 0.8 });
  const { ernstig } = await k.axe(s.page);
  await s.sluit();
  ```
  Viewports: `mobiel` (412×915), `360`, `768`, `desktop` (1440×900), of `{width,height}`. Netwerk: `netwerk: "slow3g"`.
- Je mag de testdatabase wijzigen via de UI (dat is de bedoeling); herstel het niet zelf.

## Wat je mag en niet mag
- **Geen code wijzigen** in de repository. Geen commits, geen issues, geen PR's. Je levert bevindingen.
- Meld **alleen wat je zelf hebt gezien**, met bewijs (schermafbeelding, console-uitvoer, exacte tekst). Geen vermoedens, geen "waarschijnlijk", geen bevindingen uit het lezen van code.
- Houd je aan het stappenbudget en de tijd. Stop als je vastloopt en meld dat zelf als bevinding (area `ux` of `bug`), met waar je vastliep.
- Dezelfde bevinding één keer melden. Meld geen bevinding die al in `docs/test-reports/*/findings.json` staat als "bekend" tenzij hij nog optreedt.

## Meldformaat (`s.vondst(...)` schrijft dit naar `test-results/findings-raw/<agent>.jsonl`)
```json
{ "id": "", "agent": "", "area": "bug|ux|ui|a11y|copy|pricing|security|perf|document",
  "title": "", "url": "", "viewport": "412x915", "user": "a1",
  "steps": ["…"], "expected": "", "actual": "", "screenshot": "test-results/screens/…png",
  "console_errors": [], "confidence": 0.0 }
```
`id`, `url`, `viewport`, `user`, `screenshot` en `console_errors` vult `vondst()` zelf in. Geef `confidence` eerlijk (0–1): 1 = reproduceerbaar en zeker, 0.5 = twijfel.

## Taal
UI-teksten zijn Nederlands: in de beheer-UI heet het "onderdeel", "lead" en de schakelaar "Zichtbaar"; de klant ziet "aanvraag". Het woord "werkzaamheid" komt niet voor in zichtbare teksten.

## Afsluiting
Eindig met een korte samenvatting (max. 15 regels): wat je getest hebt, aantal bevindingen, het pad van je jsonl-bestand, en wat je niet kon testen en waarom.
