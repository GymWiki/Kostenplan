# Fase 0: audit en plan, rekentool-editor

Status: voorstel, wacht op akkoord. Er is nog niets gebouwd. Alle bevindingen komen uit de code op `main` (`d9e0e8e`).

## 1. Datamodel (nu)

| Begrip | Waar | Opmerking |
|---|---|---|
| Bedrijf | `Company` | Heeft maar 3 standaardtarieven: `standaardArbeidTariefUur`, `standaardVoorrijTarief`, `standaardBtwPercentage`. |
| Rekentool | `Tool` | `status` (CONCEPT / GEPUBLICEERD / GEPAUZEERD), `deletedAt` (soft delete), `resultaatConfig`, `leadFormConfig`, `embedConfig` (Json), `activeCalculatorConfigId`. |
| Branding | `Branding` | **Per rekentool** (`toolId` unique), niet per bedrijf. Logo, kleuren, lettertype, titel, welkomst- en bedanktekst, contactgegevens, offerteteksten. |
| Tarieven | `CostSettings` (per tool) + `Company.standaard*` | Arbeidseenheid en 3 tarieven, transport, voorrij, btw, bandbreedte. Alleen uurtarief, voorrij en btw hebben een bedrijfsbrede standaard. |
| Aanvraagformulier | `Tool.leadFormConfig` | 5 aan/uit-velden (telefoon, adres, postcode, huisnummer, opmerking). |
| Resultaat | `Tool.resultaatConfig` (+ `resultaatInstellingen` in de engine) | Twee plekken: de Resultaat-pagina schrijft het eerste, de bouwer het tweede. |
| Lead | `Lead` | `toolId`, `calculatorConfigId` (versie), `snapshot` Json met regels **op naam** (geen product-id). |

**Twee rekenpaden naast elkaar; een tool gebruikt er precies één** (`welkeCalculatorVoorTool` in `app/lib/dal.ts`):

1. **Werkzaamheden (Product)**: `Product` → `MaterialCategory` → `MaterialOption` (+ `ExtraOption`), `CostSettings`. Rekent via `app/lib/calculate.ts`, rendert via `Calculator` (`app/portaal/[slug]/calculator.tsx`, 1332 regels). Wijzigingen zijn direct live. Dit is wat het huidige bewerkscherm en de wizard schrijven.
2. **Engine (onderdelen, vragen, prijsregels)**: `CalculatorConfig.config` Json met `versie` 1 (één platte calculator) of 2 (`onderdelen[]`, elk met `velden`, `afgeleideVariabelen`, `regels`). Een prijsregel is een van 7 typen (VAST, PER_EENHEID, PERCENTAGE, TOESLAG, KORTING, STAFFEL, FORMULE) met een expressieboom. Rekent via `app/lib/calculator-engine/*`, rendert via `EngineCalculator` (690 regels, een stap per onderdeel). Heeft DRAFT / PUBLISHED / ARCHIVED-versies; elke lead onthoudt de versie. `PRODUCT_KEUZE`-velden verwijzen naar een verborgen "drager"-`Product` met materialen.

De klant ziet het via `/t/[bedrijfsslug]/[toolslug]`, `/embed/[toolId]` en `/portaal/[slug]`.

## 2. Routes

**Hoofdmenu nu (5):** Overzicht `/dashboard`, Rekentools `/dashboard/tools`, Leads `/dashboard/leads`, Abonnement `/dashboard/abonnement`, Profiel `/dashboard/profiel`. Gewenst: 4 (Abonnement naar Profiel).

**Binnen een rekentool (`/dashboard/tools/[toolId]/…`) en overlap:**

| Sidebar | Route | Doet | Overlap |
|---|---|---|---|
| Overzicht | `` | Statistieken, snelkoppelingen, live-status | Dubbel met de kaarten op `/dashboard/tools` en met Publiceren |
| Calculator | `calculator` | Voorbeeld van de klant-rekentool | Wordt het midden van de editor |
| Bouwer | `bouwer` | Engine-bouwer (onderdelen, velden, regels, stappen, resultaat) | Staat los van Werkzaamheden; eigen resultaatinstellingen (2e plek) |
| Werkzaamheden | `producten`, `producten/nieuw`, `producten/[id]/bewerken`, `producten/[id]/uitgebreid` | Overzicht, aanmaken, bewerken | Zelfde doel als de bouwer |
| Prijzen | `prijzen` | `CostSettings` | Dubbel met "Mijn tarieven" (sheet), de onboarding-tarieven en Profiel |
| Uiterlijk | `uiterlijk` | Branding + auto-branding | Dubbel met de onboarding-huisstijlstap |
| Resultaat | `resultaat` | `Tool.resultaatConfig` | Dubbel met resultaat-tab in de bouwer |
| Aanvraagformulier | `aanvraagformulier` | `Tool.leadFormConfig` | n.v.t. |
| Publiceren | `publiceren` | Status en publiceren | Dubbel met Embed en de live-status op Overzicht |
| Embed | `embed` | Embed-code en -instellingen | Hoort bij Publiceren |
| Instellingen | `instellingen` | Naam, dupliceren, verwijderen | Dubbel met de knoppen op `/dashboard/tools` |

Verder: `/dashboard/tools/nieuw` (sjabloonkiezer), `/dashboard/leads/[leadId]/offerte` (blijft), `/dashboard/bedrijven/nieuw`, `/onboarding/*`.

## 3. Aantallen bestaande onderdelen en werkzaamheden

**Niet beschikbaar.** De Supabase-verbinding in deze sessie ziet alleen Calo-Webapp, fitness-logging-webapp en Statieclub; het Kostenplan-project is er niet bij. Ik kan de aantallen dus niet uit productie halen. Draai onderstaande queries (alleen lezen) in de Supabase SQL-editor van Kostenplan en plak de uitkomst, of geef me toegang.

```sql
-- 1) Tools per rekenpad
select
  count(*) filter (where "activeCalculatorConfigId" is not null) as engine_tools,
  count(*) filter (where "activeCalculatorConfigId" is null
                   and exists (select 1 from "Product" p where p."toolId" = t.id and not (p.actief = false and p."order" = -1))) as werkzaamheden_tools,
  count(*) filter (where "activeCalculatorConfigId" is null
                   and not exists (select 1 from "Product" p where p."toolId" = t.id and not (p.actief = false and p."order" = -1))) as lege_tools
from "Tool" t where t."deletedAt" is null;

-- 2) Werkzaamheden: passend in het standaardmodel of "Aangepast"
select count(*) as totaal,
       count(*) filter (where passend) as past_in_standaard,
       count(*) filter (where not passend) as aangepast
from (
  select p.id,
    ((p.sjabloon = 'ENKELE_HOEVEELHEID' and p.eenheid in ('m1','m2','stuks'))
      or (p.sjabloon = 'AFMETINGEN' and p.eenheid = 'm2'
          and coalesce((p."sjabloonConfig"->>'metDiepte')::boolean, false) = false))
    and (select count(*) from "MaterialCategory" c where c."productId" = p.id) <= 1
    and p."arbeidTariefOverride" is null and p."transportkostenOverride" is null
    and p."voorrijkostenOverride" is null
    and not p."transportMeeschalend" and not p."voorrijMeeschalend"
    and not exists (select 1 from "MaterialCategory" c join "MaterialOption" m on m."materialCategoryId" = c.id
                    where c."productId" = p.id and m.stapgrootte is not null) as passend
  from "Product" p join "Tool" t on t.id = p."toolId"
  where t."deletedAt" is null and not (p.actief = false and p."order" = -1)
) x;

-- 3) Engine: versie en omvang van de onderdelen
select c.config->>'versie' as versie, count(*) as configs
from "CalculatorConfig" c join "Tool" t on t."activeCalculatorConfigId" = c.id
where t."deletedAt" is null group by 1;

select t.naam as tool, o->>'naam' as onderdeel,
       jsonb_array_length(o->'velden') as velden, jsonb_array_length(o->'regels') as regels
from "CalculatorConfig" c join "Tool" t on t."activeCalculatorConfigId" = c.id,
     jsonb_array_elements(c.config->'onderdelen') o
where t."deletedAt" is null and c.config->>'versie' = '2';
```

Of een onderdeel echt in het standaardmodel past (alleen materialen × hoeveelheid + arbeid, geen eigen vragen of afwijkende regels) bepaalt een TypeScript-functie in fase 1; die lever ik mee als `scripts/audit-onderdelen.ts` (alleen lezen) zodat je het exacte aantal krijgt.

## 4. Review tegen de Web Interface Guidelines

Zie `AUDIT-GUIDELINES.md` (file:line, per bestand). Samenvatting van de geautomatiseerde scan over 148 bestanden: 50 bestanden hebben bevindingen. Grootste groepen: 53 placeholders zonder ellipsis, 40 `Button size="sm"` (32 px, onder de 44 px-tikdoel), 17 `autoFocus`, ±41 invoervelden zonder zichtbaar label of `aria-label` (merendeels in de oude bouwer, de leads en de offerte-editor; deels vals-positief, gemarkeerd met **?**), 4 `transition: all`, 1 `<img>` zonder afmetingen, 1 klikbare `div`. Niet aanwezig in de hele app: `touch-action: manipulation`, `color-scheme` op de root, `overscroll-behavior: contain` in `Overlay`/`Sheet`.

## 5. Voorstel

### Belangrijkste keuze: waar slaat een werkzaamheid op?
Je fase 1 schrijft een functie die een werkzaamheid omzet naar onderdeel + vragen + prijsregels. Dat is pad A hieronder. Ik zie drie paden:

- **A. Alles in de engine (jouw tekst).** Een werkzaamheid is een module die `OnderdeelConfig` (versie 2) genereert. Voordeel: standaard en "Aangepast" kunnen in één rekentool naast elkaar staan. Nadelen: de DRAFT/PUBLISHED-versies botsen met "wijzigingen zijn direct live" (elke autosave wordt een nieuwe versie, of we overschrijven de gepubliceerde versie waar leads naar verwijzen); tarieven staan nu als vast getal in de regels en moeten dan overal herschreven worden; de engine rekent als wizard met een stap per onderdeel in plaats van één scherm.
- **B. Werkzaamheden blijven `Product`, de engine blijft voor bestaande "Aangepaste" tools.** Een nieuwe rekentool is altijd "Standaard" (de editor van fase 2–3 die er al staat). Bestaande engine-tools blijven werken en tonen het label "Aangepast" op **rekentool**-niveau, met een samenvatting en "Omzetten naar standaard" (met prijsverschil vooraf). Nadeel: je kunt niet binnen één rekentool standaard en aangepaste werkzaamheden mengen.
- **C. Product als opslag, engine alleen als "vertaler".** Zoals B, plus de gevraagde pure functie `werkzaamheidNaarOnderdeel()` met equivalentietests tegen de huidige motor (bewijs dat het standaardmodel exact hetzelfde rekent). Die functie dient ook als basis voor het omzetten van een engine-onderdeel naar een werkzaamheid.

**Mijn aanbeveling: C.** Het is het kleinste risico voor bestaande rekentools en leads, hergebruikt wat net live staat, en geeft je alsnog de geteste vertaalfunctie. Het enige wat je verliest is mengen binnen één rekentool, wat ik pas nodig acht als de aantallen uit punt 3 laten zien dat veel tools aangepaste en standaard-werkzaamheden combineren.

### Componentenstructuur
- `editor/` onder `app/dashboard/tools/[toolId]/`: `EditorShell` (bovenbalk, modus Bewerken/Uitproberen, opslaan-status, menu, "Zet op mijn website"), `KlantCanvas`, `PaneelHost` (zijpaneel op desktop, bottom sheet op mobiel met veeg-om-te-sluiten), en de panelen `Uiterlijk`, `Werkzaamheid`, `Resultaat`, `Aanvraagformulier`, `Start` (checklist), `Website` (embed-uitleg per websitebouwer) en `Tarieven`.
- De huidige editor-blokken (Basis, Materialen, Arbeid, Vaste kosten, Geavanceerd) worden het `Werkzaamheid`-paneel; het kostenopbouw-blok en de autosave-hook worden hergebruikt.
- Selectie staat in de URL (`?paneel=uiterlijk`, `?paneel=werkzaamheid:<id>`): dat maakt de redirects mogelijk en de links vanuit Leads.
- **Gast-flow:** de editor praat met een `EditorBron`-interface (laden, opslaan, presets), niet direct met de database; een gastsessie kan later een andere bron aanleveren zonder tweede UI.

### De klant-rekentool in het midden
`Calculator` is een volledige pagina (`min-h-screen`, `lg:`-breakpoints op de viewport). Een smalle container levert dus geen echte mobiele weergave. Voorstel: **een `<iframe>` op een eigen voorbeeldroute** (`/dashboard/tools/[toolId]/voorbeeld`) met echte breedte (390 px of 1000+ px), die de concept-gegevens via `postMessage` krijgt en klikken terugmeldt. Het gevolg: echte klantweergave en echte breakpoints, geen CSS-lekkage. Alternatief: de `Calculator` omzetten naar container-queries (veel regels aanpassen, risico voor de publieke pagina).
Extra in `Calculator`: een `testmodus`-prop (geen analytics, aanvraag versturen uit met de tekst "Testmodus: er wordt geen aanvraag verstuurd") en markeerbare gebieden (kop, werkzaamheid, resultaat, formulier).

### Migratie
- **Tarieven per bedrijf** ("Profiel → Tarieven, geldt voor alle rekentools"): nu zijn dagdeel-/dagtarief en transport alleen per tool. Voorstel: `Company` krijgt `standaardArbeidTariefDagdeel`, `…Dag` en `standaardTransportTarief`, en `CostSettings` krijgt bijbehorende `gebruiktAccount…`-vlaggen. Bestaande tools houden hun huidige (eigen) waarden; alleen nieuwe tools volgen het bedrijf. Additief, geen dataverlies.
- **Branding per bedrijf:** nu per tool. Zolang er één rekentool per bedrijf is, valt dat samen. Bij twee rekentools zou "per bedrijf" betekenen dat ze hun branding delen. Voorstel: branding blijft per rekentool (de klik-op-de-kop werkt dan gewoon), Profiel toont de huidige van de eerste/live rekentool read-only. Zeg het als je echt een gedeelde bedrijfsbranding wilt, dan is dat een aparte migratie.
- **Lead → werkzaamheid:** het snapshot bevat alleen namen. Voor "Bekijk in rekentool" voeg ik vanaf nu `productId` toe aan nieuwe snapshotregels (additief). Oude leads openen de editor zonder selectie.
- Geen verwijdering van tabellen of kolommen.

### Redirects
`/dashboard/abonnement` → `/dashboard/profiel#abonnement`. Per rekentool: `` en `calculator` → `/…/[toolId]` (editor); `bouwer` en `producten*` → editor met `?paneel=werkzaamheid:<id>` of het startpaneel; `prijzen` → editor met `?paneel=tarieven`; `uiterlijk` → `?paneel=uiterlijk`; `resultaat` → `?paneel=resultaat`; `aanvraagformulier` → `?paneel=aanvraag`; `publiceren` en `embed` → `?paneel=website`; `instellingen` → editor met menu. Pas na controle verwijderen.

### Risico's
1. De engine-bouwer is groot (±30 bestanden); die laat ik tot na de migratie staan en haal ik pas daarna weg.
2. De iframe-aanpak vraagt een nette `postMessage`-grens (alleen eigen origin).
3. "Wijzigingen gaan direct live" werkt voor het Product-pad al zo; bij een engine-tool niet (versies). Daarom blijft een "Aangepaste" tool read-only in de editor tot hij is omgezet.
4. Sjablonen van andere vakgebieden (keuken e.d.) blijven achter de bestaande `ALLEEN_HOVENIER`-vlag.
5. Zonder productiedata (punt 3) kan ik de omvang van de omzetting nog niet inschatten.

### Fasering
Fase 1 (model, vertaalfunctie, tests, presets, audit-script) → Fase 2 (navigatie en redirects) → Fase 3 (Rekentools-overzicht) → Fase 4 (editor, in stukken: shell + iframe-canvas, dan panelen, dan mobiele sheet) → Fase 5 (Leads) → Fase 6 (guidelines, copy, opruimen). Na elke fase: typecheck, tests, build, korte samenvatting en jouw akkoord.

## 6. Open vragen

1. **Opslagpad:** A, B of C (aanbeveling C)?
2. **Branding:** per rekentool laten (aanbeveling) of per bedrijf maken?
3. **Productiedata:** wil je de queries in punt 3 draaien, of me toegang geven?
4. **Presets:** "Haag planten" heet nu "Haag / beplanting" en "Tuinonderhoud" staat er nog bij; wil je precies jouw lijst van 8?
