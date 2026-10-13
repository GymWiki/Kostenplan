# Draaiboek voor een volledige agentronde

Dit draaiboek is voor de **hoofdsessie** (Claude Code). Het wordt gestart met `npm run test:agents` (voorbereiding) en daarna door de hoofdsessie uitgevoerd. Alles draait op de lokale testomgeving, nooit op productie.

## 0. Voorbereiding (script)
`npm run test:agents` doet: testomgeving controleren/starten (`scripts/test/start-env.sh --zonder-build` als de app al gebouwd is), database leegmaken en seeden, `test-results/findings-raw/`, `screens/`, `verified/` leegmaken. Daarna volgt dit draaiboek.

## 1. Agents starten (parallel, groepen van maximaal 6)
Gebruik per run het agenttype uit `.claude/agents/` (de Agent-tool met `subagent_type`; zijn de definities niet geladen, geef dan de inhoud van het agentbestand als prompt aan een `general-purpose` agent met het `model` uit het bestand). Prompt per run:

> Base-URL: `http://localhost:3200`. Testgebruiker: `<gebruiker>`. Viewport: `<viewport>`. Stappenbudget: `<n>` acties, tijdsbudget `<m>` minuten. Opdracht: `<route/persona/gebied>`. Je naam voor bestanden: `<agent>-<nummer>`. Lees `docs/test-agents-regels.md`. Wijzig geen code. Meld alleen wat je zelf zag, met bewijs.

Groepen (elke mutatie op een eigen kopie van hovenier A, zodat agents elkaar niet storen). Seed opnieuw (`npm run test:seed`) vóór elke groep.

| Groep | Runs (gebruiker) |
|---|---|
| 1 | flow 1 (nieuw account) · flow 2 (a1) · flow 3 (a2) · flow 4 (a3) · ui-auditor (b, leest alleen) · a11y-auditor (b, leest alleen) |
| 2 | flow 5 (a1) · flow 6 (a2, maakt `/tmp/pdok-down` aan en weer weg) · flow 7 (a3) · copy-auditor (b) · pricing-checker (anoniem + a1 leest) · document-checker (b leest; a1 voor PDF's) |
| 3 | persona Henk (a1, 412) · persona Sanne (a2, desktop) · persona particulier (anoniem, mobiel) · edge-case-tester (a3) |
| 4 | security-tester (b tegen a1) |
| 5 | perf-tester (alleen, zodat metingen niet door andere agents worden verstoord) |

Standaardbudget: 150 acties en 20 minuten per run (flows 5 en 4: 250 acties / 30 minuten).

## 2. Verzamelen
Alle bevindingen staan in `test-results/findings-raw/*.jsonl`. Voeg samen tot één lijst (ongeverifieerd).

## 3. Verifier
Seed opnieuw. Start de `verifier` (sonnet) met de samengevoegde lijst, in blokken van maximaal 12 bevindingen per verifier-run (parallel, maximaal 3 runs tegelijk, eigen gebruiker per run). Resultaat: `test-results/verified/*.json`.

## 4. Rapport
`node scripts/test/rapport.mjs <datum>` maakt `docs/test-reports/<datum>/` uit raw + verified: `report.md`, `findings.json`, `rejected.json`, `screenshots/`. Controleer het rapport en vul de top 10 en de voorgestelde fixvolgorde aan.

## 5. Issues
Voor P0 en P1 één GitHub-issue per bevinding (titel `[P0|P1][gebied] titel`, labels prioriteit + gebied, body met stappen, verwacht/werkelijk, scherm en omgeving). Er wordt in de testopdracht niets gefixt.

## Regel
Elke gefixte bug krijgt een vaste test (unit-, e2e- of agent-regressietest) in dezelfde PR; zie `docs/testing.md`.
