# Kostenplan — UX-audit dashboard

## Status van dit rapport

**Nog niet ingevuld met echte bevindingen.** Dit is een klaarstaande
structuur, geen afgeronde audit. De sessie die dit voorbereidde kon de app
niet daadwerkelijk draaien: het netwerkbeleid van die remote/cloud
Claude Code-sessie blokkeert alle uitgaande verbindingen naar het echte
Supabase-project (bevestigd via een directe test: `POST /auth/v1/signup`
kwam terug met `403 Forbidden — "Host not in allowed hosts"` van de eigen
egress-proxy, en de rauwe Postgres-verbinding via `DATABASE_URL` hangt tot
een timeout — beide expliciet bevestigd als niet-ondersteund in
`/root/.ccr/README.md`). Er kon dus geen enkel scherm achter de login
daadwerkelijk bezocht of gescreenshot worden vanuit die sessie.

**Wat er wél klaarstaat:**
- `ux-audit/run_audit.py` — een volledig uitgeschreven Playwright-script
  dat inlogt (of registreert als het testaccount nog niet bestaat), de
  onboarding afrondt, een rekentool aanmaakt als er nog geen bestaat, en
  vervolgens elk bekend scherm in de app bezoekt (zowel de account-brede
  navigatie als de volledige tool-eigen navigatie: Bouwer, Producten,
  Prijzen, Uiterlijk, Resultaat, Aanvraagformulier, Publiceren, Embed,
  Instellingen), op zowel desktop- als mobiel-viewport, met screenshots en
  automatisch opgevangen consolefouten.
- `ux-audit/README.md` — hoe dat script te draaien in een omgeving met
  gewone internettoegang.
- Deze structuur hieronder, met exact de schermen die het script bezoekt,
  klaar om in te vullen zodra het script daadwerkelijk heeft gedraaid.

**Volgende stap:** draai `python3 ux-audit/run_audit.py` in een omgeving
met toegang tot Supabase (zie README), en vul daarna elke sectie hieronder
in op basis van de gegenereerde screenshots en `findings.json`.

---

## Legenda

| Tag | Betekenis |
|---|---|
| 🐛 `bug` | Werkt niet zoals bedoeld: layoutfout, foutmelding, kapotte interactie. |
| ✂️ `vereenvoudigingskans` | Werkt, maar kan simpeler zonder functionaliteit te verliezen (minder tegelijk zichtbare keuzes, betere progressive disclosure, minder klikken). |
| ❌ `ontbrekend/kapot` | Functionaliteit die er hoort te zijn maar niet werkt of niet bereikbaar is — apart van gewone UX-issues, want dit blokkeert een taak volledig. |

Per scherm te beoordelen (uit de opdracht):
1. Aantal gelijktijdig zichtbare keuzes/velden — allemaal op dat moment nodig?
2. Verschijnen geavanceerde/optionele instellingen pas als relevant, of staan ze altijd zichtbaar (ook uitgeschakeld)?
3. Layoutbugs: overlap, afgekapte tekst, rare witruimte, inconsistente knopgroottes/kleuren.
4. Consolefouten of gebroken interacties (bijv. een lege overlay).
5. Werkt alle verwachte functionaliteit daadwerkelijk, en is die bereikbaar?

---

## Authenticatie & onboarding

### Inloggen (`/login`)
- Screenshot(s): _(zie ux-audit/*-login--*.png)_
- Bevindingen: _TODO_

### Registreren (`/registreren`)
- Screenshot(s): `00-desktop-registreren.png` (al gemaakt — zie hieronder)
- Bevindingen: Formulier is minimaal (alleen e-mail + wachtwoord, plus
  Google-optie) — geen bedrijfsnaam-veld hier, dat komt pas in de
  onboarding. _Verder in te vullen na klik-test._

### Onboarding: bedrijf aanmaken (`/onboarding/bedrijf`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Onboarding: rekentool (`/onboarding/rekentool`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Onboarding: huisstijl (`/onboarding/huisstijl`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

---

## Account-brede navigatie

### Dashboard-overzicht (`/dashboard`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Rekentools-overzicht (`/dashboard/tools`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Nieuwe rekentool — startpunt kiezer (`/dashboard/tools/nieuw`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Nieuwe rekentool — sjabloon-preview modal
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Nieuwe rekentool — naamstap
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Leads-overzicht (`/dashboard/leads`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Lead-detail (drawer)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_ (vereist minstens één binnengekomen aanvraag — zie
  README, "bekende blinde vlekken")

### Offerte omzetten (`/dashboard/leads/[leadId]/offerte`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_ (idem — vereist een lead)

### Abonnement (`/dashboard/abonnement`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Profiel (`/dashboard/profiel`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Nieuw bedrijf toevoegen (`/dashboard/bedrijven/nieuw`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

---

## Tool-eigen navigatie (per rekentool)

### Tool-overzicht (`/dashboard/tools/[toolId]`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Calculator-preview (`/dashboard/tools/[toolId]/calculator`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Bouwer (`/dashboard/tools/[toolId]/bouwer`)
- Screenshot(s): _TODO_ (incl. per tab)
- Bevindingen: _TODO_

### Producten-lijst (`/dashboard/tools/[toolId]/producten`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Product aanmaken (`/dashboard/tools/[toolId]/producten/nieuw`)
- Screenshot(s): _TODO_ (voor + na opslaan)
- Bevindingen: _TODO_

### Productvelden (`/dashboard/tools/[toolId]/producten/velden`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Prijzen (`/dashboard/tools/[toolId]/prijzen`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Uiterlijk (`/dashboard/tools/[toolId]/uiterlijk`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Resultaat (`/dashboard/tools/[toolId]/resultaat`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Aanvraagformulier (`/dashboard/tools/[toolId]/aanvraagformulier`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Publiceren (`/dashboard/tools/[toolId]/publiceren`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Embed (`/dashboard/tools/[toolId]/embed`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Instellingen (`/dashboard/tools/[toolId]/instellingen`)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

### Publieke rekentool (klant-kant)
- Screenshot(s): _TODO_
- Bevindingen: _TODO_

---

## Mobiel (390×844) — afwijkingen t.o.v. desktop

_Vul hier alleen in wat op mobiel écht anders is dan hierboven al
beschreven (andere layout, verborgen elementen, extra tap-targets-issues,
enz.) — niet elk scherm opnieuw volledig herhalen als het identiek is,_
maar bevestig dat wel met een screenshot per scherm (zoals de opdracht
vraagt), ook als de conclusie "geen verschil" is.

---

## Geprioriteerde top-10 — eerst oppakken voor de grootste UX-winst

_In te vullen na de volledige doorloop, gesorteerd op impact (hoogste
eerst). Voorbeeldformaat:_

1. **[bug|vereenvoudigingskans|ontbrekend] Titel** — waarom dit het meest impactvol is, en welk scherm het betreft.
2. …
