# Kostenplan UX-audit — draaiinstructies

Dit script is voorbereid in een remote Claude Code-sessie waarvan het
netwerkbeleid alle uitgaande verbindingen naar het echte Supabase-project
blokkeert (bevestigd: `POST /auth/v1/signup` → `403 Host not in allowed
hosts` van de eigen egress-proxy, en de rauwe `DATABASE_URL`-verbinding
hangt/timeout — zie `/root/.ccr/README.md`, secties "403/407 from the
proxy" en "raw-TCP databases"). Het kon daardoor hier niet worden
uitgevoerd of geverifieerd. Voer het uit op een machine met gewone
internettoegang (bijv. lokaal, of een Claude Code-sessie op je eigen
computer).

## 1. Voorbereiden

```bash
cd Kostenplan
npm install                 # als dat nog niet is gebeurd
pip install playwright
playwright install chromium # alleen nodig als je nog geen Chromium-install hebt
```

`.env.local` moet in de projectroot staan met minimaal:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=...   # transaction pooler, poort 6543
DIRECT_URL=...     # session pooler, poort 5432
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Zie `.env.example` voor de exacte vorm van elke variabele. Gebruik poort
3000 (of pas `NEXT_PUBLIC_APP_URL` én `BASE_URL` in het script gelijk aan
elkaar aan) — een mismatch tussen de twee triggerde in deze sessie een
verwarrende "Host not in allowed hosts"-fout bij elke server action.

## 2. Dev-server starten

```bash
npm run dev
```

Wacht tot je `✓ Ready` ziet en `http://localhost:3000` een 200 teruggeeft.

## 3. Audit draaien

```bash
python3 ux-audit/run_audit.py
```

Het script:
- logt in met `pieter.kluvers06@gmail.com` / `u73tnxgd`, en registreert dat
  account automatisch als het nog niet bestaat;
- doorloopt de onboarding (bedrijf → rekentool → huisstijl) als die nog
  niet is afgerond;
- maakt zo nodig een eerste rekentool aan via de sjabloon-flow;
- bezoekt elk scherm uit de account-brede sidebar (Overzicht, Rekentools,
  Leads, Abonnement, Profiel) én elk scherm uit de tool-eigen navigatie
  (Overzicht, Calculator, Bouwer — incl. tabs, Producten — incl. een
  product aanmaken, Prijzen, Uiterlijk, Resultaat, Aanvraagformulier,
  Publiceren, Embed, Instellingen);
- doet dit twee keer: eerst volledig op desktop-viewport (1440×900), dan
  nog een keer op mobiel-viewport (390×844) in een verse browsercontext
  (dus met een echte herlaad, niet alleen CSS-resize);
- vangt console-errors/-warnings, ongevangen pagina-fouten en HTTP-
  responses ≥400 op per scherm;
- telt zichtbare knoppen/links/velden/selects per scherm (basis voor de
  "hoeveel keuzes tegelijk zichtbaar"-vraag uit de opdracht);
- schrijft alles naar `ux-audit/*.png` + `ux-audit/findings.json`.

Elke stap staat in zijn eigen `try/except` — een gefaalde stap (bijv. een
selector die niet meer klopt, of een écht kapotte flow) stopt de rest van
de audit niet, maar wordt zelf als aparte bevinding gelogd ("FOUT: ...").
Controleer die regels in `findings.json` altijd handmatig: het kan een
echte bug zijn, of gewoon een verouderde selector in dit script.

**Bekende blinde vlekken van dit script** (met opzet niet generiek
gescript, te fragiel/te contextafhankelijk):
- De leads-kanban wordt bezocht, maar een vers testaccount heeft nog geen
  aanvragen. Het script probeert daarom aan het eind een testaanvraag te
  versturen via de publieke tool-URL — dat opent de publieke rekentool,
  maar vult 'm niet verder in (calculatorvelden verschillen te veel per
  sjabloon om generiek te scripten). Vul een testaanvraag handmatig in en
  draai de leads-sectie daarna nog eens, om ook de "omzetten naar
  offerte"-flow (`/dashboard/leads/[leadId]/offerte`) te kunnen
  screenshotten.
- De bouwer-flow klikt tabs aan en probeert één item te openen, maar gaat
  niet dieper (een veld bewerken, een prijsregel toevoegen, condities
  instellen) — dat verdient een eigen, gerichte doorloop.
- Google-login (`Doorgaan met Google`) wordt niet getest — vereist een
  echte OAuth-redirect die zich niet leent voor headless automation zonder
  een voorbereid testaccount bij Google.

## 4. Rapport invullen

`ux-audit/report.md` staat al klaar met de structuur die de opdracht
vraagt (per scherm: keuzes/velden-dichtheid, progressive disclosure,
layoutbugs, consolefouten, ontbrekende functionaliteit — elk getagd als
`bug`, `vereenvoudigingskans` of `ontbrekende/kapotte functionaliteit| —
en een geprioriteerde top-10 aan het eind). Loop na het draaien van het
script `findings.json` en de screenshots door en vul de bevindingen in;
het script genereert zelf geen kwalitatief oordeel, alleen de ruwe
waarnemingen (screenshots, foutmeldingen, elementtellingen) die dat oordeel
onderbouwen.
