#!/bin/bash
# Bereidt een volledige agentronde voor (zie docs/test-agents-ronde.md). Gebruik: npm run test:agents [-- --uitvoeren]
# Zonder --uitvoeren: omgeving klaarzetten en het draaiboek tonen (start daarna Claude Code en laat de hoofdsessie het draaiboek uitvoeren).
# Met --uitvoeren: start Claude Code non-interactief (vereist de `claude` CLI) met het draaiboek als opdracht.
cd "$(dirname "$0")/../.."
if ! curl -s -o /dev/null http://localhost:3200/login; then bash scripts/test/start-env.sh || exit 1; else bash scripts/test/reset-db.sh || exit 1; fi
rm -rf test-results/findings-raw test-results/screens test-results/verified test-results/repro
mkdir -p test-results/findings-raw test-results/screens test-results/verified test-results/repro
echo "Omgeving klaar. Testdata: test-results/seed.json"
if [ "$1" = "--uitvoeren" ]; then
  command -v claude >/dev/null || { echo "De claude CLI ontbreekt; voer docs/test-agents-ronde.md handmatig uit." >&2; exit 1; }
  claude -p "Voer docs/test-agents-ronde.md volledig uit voor een nieuwe testronde. Lees ook docs/testing.md." --permission-mode acceptEdits
else
  echo; echo "Volgende stap: laat Claude Code docs/test-agents-ronde.md uitvoeren (opdracht: 'Voer docs/test-agents-ronde.md uit')."
fi
