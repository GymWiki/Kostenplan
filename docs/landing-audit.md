# Landingspagina — audit (fase 0)

Datum: 2026-10-10 · basis: `main` @ 0feeb9e

## Huidige pagina (`app/page.tsx`, 550 regels)

Volgorde: hero (kop "Laat klanten zelf de prijs van hun tuin berekenen", twee CTA's,
`WebsiteCalculatorMockup`) → GEO-antwoordblok → scanregel "Rekentool voor al je tuinwerk"
→ `ScrollCalculatorDemo` → "Zo werkt het" (3 gelijke kaarten) → `UseCaseSwitcher` →
"Waarom Kostenplan" (kaarten) → prijzen (`MarketingPricingTable`, drie kaarten) →
FAQ → afsluiter. Vrijwel elke sectie: eyebrow → kop → subkop → grid van afgeronde
kaarten, gecentreerd. Het hero-beeld is een statische mockup, niet de echte component.

- **Metadata:** title 71 tekens (te lang, limiet 60), description ruim 155 tekens;
  canonical, OG/Twitter aanwezig; OG-afbeelding (`app/opengraph-image.tsx`) is een
  groen vlak met "K" en de merknaam, geen productbeeld.
- **Structured data:** `Organization` (zonder KVK/adres/sameAs) en
  `SoftwareApplication` met één Offer (Gratis, €0). Geen `FAQPage`, geen `WebSite`,
  Plus/Pro ontbreken.
- **Interne links:** `/probeer`, `/voorbeelden-rekentools`, `/voor/hoveniers`,
  `/#prijzen`; verder via header/footer.
- **Lighthouse mobiel (lokale productiebuild, gesimuleerde throttling):**
  Performance 94 · Accessibility 97 · Best Practices 100 · SEO 100 ·
  LCP 2,9 s · CLS 0 · TBT 140 ms.
- **Fonts:** Plus Jakarta Sans voor de hele site (`app/layout.tsx`).

## Herbruikbaar

| Onderdeel | Hergebruik |
| --- | --- |
| Klant-rekentool `app/portaal/[slug]/calculator.tsx` | **Ja, in de hero.** Met een `EditorHaken`-object in modus "uitproberen" doet hij geen analytics-aanroepen, verstuurt hij geen aanvraag ("Testmodus") en staat het eerste onderdeel al ingevuld (dus ook server-rendered). |
| `draftNaarProducten/Branding/Kosten` (`app/lib/draft-editor.ts`) + presets | **Ja**: bouwt uit de echte presets de Prisma-vormige data voor de rekentool, zonder database. |
| Leads-weergave (`dashboard/leads/*`) en offerte-weergave (`offerte/[token]`, `offerte-pdf`) | **Nee**: gebonden aan server-data, auth en acties. De landing krijgt presentatiecomponenten met dezelfde velden (m², materiaalkeuze, berekende prijs, contactgegevens; conceptofferte met regels). |
| Beheerweergave (`editor/werkzaamheid-paneel`) | **Nee** op de landing (trekt de hele editor mee in de bundel). Er komt een lichte variant die de echte rekentool live laat meerekenen. |
| `PricingTable`, `FaqSection`, `StructuredData`, `SiteHeader/Footer` | Prijsgegevens (`PRIJZEN`, `PLAN_LIMITS`) wel; de componenten niet (nieuwe vorm). |

## SEO-basis

- `app/sitemap.ts` (revalidate 24 u, bevat ook gepubliceerde rekentools; bij een
  onbereikbare database brak de build — nu opgevangen), `app/robots.ts` (alleen `*`,
  geen AI-crawlers expliciet, geen `/llms.txt`), IndexNow-route + GitHub-workflow
  (gebruikt dezelfde sitemap-bron), canonical per pagina, `lang="nl"`.
- Ontbreekt: `/llms.txt`, FAQPage/WebSite-schema, "laatst bijgewerkt", ontworpen OG-afbeelding.

## Teksten met andere beroepsgroepen of niet-hoveniers

- `app/lib/doelgroepen.ts` bevat 12 doelgroepen (schilders, aannemers, loodgieters, …);
  `app/voor/*` bestaat voor alle. `trade-config.ts` bepaalt welke zichtbaar zijn.
- `app/voor/page.tsx`: "Voor vakmensen". `doelgroep-landing.tsx`: "Ook een rekentool voor
  andere vakmensen", "tarieven van de vakman zelf".
- Gedeelde `SiteFooter` toont kolom "Voor …" met alle zichtbare doelgroepen.
- Op de landing zelf: geen andere beroepsgroepen; "klanten" wordt als lezer nergens
  aangesproken (de lezer is de hovenier). De nieuwe landing krijgt een eigen header en
  footer zodat dit niet via gedeelde componenten terugkomt. Andere pagina's blijven ongewijzigd.

## Abonnementen (uit `app/lib/subscription.ts`, `pricing-table.tsx`, calculator)

| | Gratis | Plus | Pro |
| --- | --- | --- | --- |
| Prijs | €0 | €29/maand · €299/jaar | €69/maand · €699/jaar |
| Rekentools | 1 | 5 | onbeperkt |
| Onderdelen (werkzaamheden) | 10 (over alle rekentools) | onbeperkt | onbeperkt |
| Eigen logo en kleuren | nee (Kostenplan-standaard + "Powered by Kostenplan") | ja, geen badge | ja |
| "Offerte aanvragen"/leads | nee | ja | ja |
| Insluiten via iframe op eigen website | nee (wel een link) | nee (wel een link) | ja |
| Support | — | — | prioriteit |

Let op voor de pagina: eigen huisstijl, aanvragen/leads en insluiten zijn dus géén
Gratis-functies. De pagina zegt dat eerlijk (zie `docs/landing-design.md`).
Plus jaarlijks (€299) bestaat in de code en wordt dus wél getoond.

## Analytics

Er is geen analytics-aanbieder in de code (geen GA, Plausible, Vercel Analytics). De
bestaande `AnalyticsEvent`-tabel is per rekentool/bedrijf en niet geschikt voor
landingsklikken. Zie fase 5, punt 8, in de PR.
