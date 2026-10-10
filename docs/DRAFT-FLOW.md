# Uitproberen zonder account (voorbeeld in de browser)

Een hovenier bouwt op `/probeer` een rekentool zonder account. Het voorbeeld staat
alleen in zijn browser (localStorage). Maakt hij een account, dan wordt het
automatisch overgenomen. Wist hij zijn browsergegevens, dan is het voorbeeld weg
(bewust geaccepteerd). Geen anonymous sign-ins, geen captcha, geen cron, geen
extra geheimen, geen Upstash.

## Fase 0 — Audit van PR #40 en plan

PR #40 bouwde een zwaardere variant: anonieme Supabase-sessies, Turnstile,
Upstash-rate-limit, een cron-opruimjob, gast-tokens en een admin-funnel.

**Verwijderd:** `app/admin/*`, `app/api/cron/gast-opruimen`, `vercel.json` (cron),
`app/components/auth/turnstile-veld.tsx`, `app/lib/turnstile.ts`,
`app/lib/rate-limit*.ts`, `app/lib/gast*.ts`, `app/lib/actions/gast*.ts`,
`app/probeer/{editor,klaar,overnemen}` (oude versies), `PLAN-GAST-FLOW.md`; de
captcha-/anonymous-aanpassingen in login, registratie, `dal.ts`, `proxy.ts`,
`supabase/config.toml` en `.env.example` zijn teruggedraaid.

**Behouden / hergebruikt:** de `/probeer`-pagina (herschreven), de presetkiezer,
de branding-extractie (verhard), en de editor-aanpassingen die niet aan anonymous
auth hingen. De editor is nu één component met een *repository* (zie onder).

**Nieuw:**

| Onderdeel | Bestand |
| --- | --- |
| Concept-model + zod-schema | `app/lib/draft.ts` |
| Opslag (localStorage + geheugen-fallback, ±400 ms debounce, 30 dagen) | `app/lib/draft-opslag.ts` |
| Logo verkleinen in de browser (max 256 px, ≤100 KB) | `app/lib/logo-verklein.ts` |
| Repository-interface, server-variant | `app/dashboard/tools/[toolId]/editor/repository.tsx` |
| Repository, lokale variant | `app/probeer/lokale-repository.ts` |
| Gast-editor (zelfde `RekentoolEditor`) | `app/probeer/gast-editor.tsx` |
| Overnemen na inloggen | `app/probeer/importeren/*`, `app/lib/actions/draft-import.ts` |
| Publiek branding-endpoint | `app/api/branding/voorbeeld/route.ts` |

**Concept-model** (`kostenplan:draft:v1`):
`{ version: 1, id, updatedAt, company{name, logoDataUrl?, colors}, tarieven{tarief, voorrijkosten, transport}, calculator{name, werkzaamheden[…]} }`.
Concepten ouder dan 30 dagen of die niet door het schema komen worden genegeerd en gewist.

**Gast-modus is client-only.** Het enige netwerkverkeer is de branding-aanvraag.
`proxy.ts` slaat `/probeer` over (geen Supabase-aanroep); alleen
`/probeer/importeren` vraagt een sessie. Vergrendeld met "Maak een gratis account
om dit te gebruiken": embed-code/publiceren, leads, offertes, tweede rekentool,
resultaat- en aanvraagformulier-instellingen.

**Overnemen (`importDraftAction`).** Na de eerste login naar `/probeer/importeren`:
de server valideert het concept opnieuw met hetzelfde schema (aantallen, lengtes,
getallen, HTML eruit, logo-magic-bytes, png/jpg/webp ≤ 200 KB, gratis-limieten),
maakt bedrijf + tarieven + rekentool + onderdelen in één transactie en gebruikt
niets uit het concept als user-id. Idempotent via `Tool.importSleutel` (unieke
sleutel per bedrijf) en een advisory lock. Heeft het account al een bedrijf, dan
volgt de keuze "Toevoegen als nieuwe rekentool" of "Voorbeeld weggooien"; er wordt
nooit stilletjes iets overschreven. Geen concept: geen fout, je gaat gewoon door.

**Risico's:** zonder database in deze omgeving zijn de server-kanten (import,
Storage-upload) alleen met unit-tests en typecontrole gecontroleerd; zie het
testverslag in de PR.

## Branding-endpoint (publiek, zonder login)

`POST /api/branding/voorbeeld` met `{ "url": "voorbeeld.nl" }`. Alleen http(s);
localhost, privé-, link-local- en andere interne adressen worden geweigerd, ook na
DNS-resolutie en bij elke redirect (max. 3); 5 s per verzoek, 12 s totaal;
maximale groottes; geen cookies of headers van de bezoeker doorgegeven; alleen
HTML/CSS/afbeeldingen. Bij elke mislukking: 200 met de vaste tekst "We konden je
logo niet ophalen. Je kunt het zelf toevoegen." — de browser valt dan terug op
neutrale kleuren. Er wordt niets opgeslagen.

### Aanbevolen Vercel Firewall rate-limit (niet in code)

Vercel → project → **Firewall** → **Configure** → **Custom Rules** → **Add rule**:

- Naam: `branding-voorbeeld ratelimit`
- Als: *Request Path* **equals** `/api/branding/voorbeeld`
- Dan: **Rate Limit**, Fixed window, **10 verzoeken per 60 seconden**, per **IP-adres**
- Actie bij overschrijding: **Deny** (429)

Daarna **Review Changes** → **Publish**. 10 per minuut is ruim voor één hovenier;
zet het lager (bijv. 5) als er misbruik zichtbaar wordt in het Firewall-overzicht.

## Wat jij handmatig moet doen (in deze volgorde)

Volgorde is zo gekozen dat inloggen nooit breekt.

1. **Merge en deploy deze PR** (productie deployt vanzelf vanaf `main`). Controleer
   daarna dat inloggen, registreren en Google-login werken.
2. **Supabase → Authentication → Sign In / Providers →** "Allow anonymous
   sign-ins" **uit**. (De app gebruikt het niet meer; bestaande anonieme gebruikers
   blijven bestaan, zie stap 5.)
3. **Supabase → Authentication → Attack Protection →** Captcha-protection **uit**
   — pas ná stap 1 (de nieuwe code stuurt geen captcha-token meer mee; staat
   captcha dan nog aan, dan faalt inloggen). Volgorde: eerst deploy, dan captcha
   uit.
4. **Vercel → Project → Settings → Environment Variables:** verwijder
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `GAST_TOKEN_SECRET`,
   `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` en
   `ADMIN_USER_IDS` (de exacte namen die jij hebt gezet; ze worden nergens meer
   gelezen). Verwijder ook de cron-job in Vercel → Settings → Cron Jobs als die
   er nog staat (`vercel.json` is weg, dus hij verdwijnt bij de volgende deploy).
5. **Opruimen van data van PR #40 — alleen na controle.** De migratie
   `20261011090000_gast_flow` staat nog in de repo en kolommen/tabel bestaan
   mogelijk al in productie. Er wordt niets verwijderd waar data in staat. Controleer
   in de Supabase SQL-editor:

   ```sql
   select count(*) from "GastGebeurtenis";
   select count(*) from "Company" where "gastVerlooptOp" is not null or "gastBron" is not null;
   select count(*) from auth.users where is_anonymous;
   ```

   Zijn alle drie 0, dan kun je het terugdraaien met een nieuwe migratie:

   ```sql
   DROP TABLE "GastGebeurtenis";
   DROP INDEX IF EXISTS "Company_gastVerlooptOp_idx";
   ALTER TABLE "Company" DROP COLUMN "gastVerlooptOp", DROP COLUMN "gastBron";
   ```

   Zijn ze niet 0, laat het dan staan en meld het mij. (Anonieme gebruikers met een
   bedrijf kun je verwijderen in Supabase → Authentication → Users zodra je ze
   hebt bekeken.)
6. **Database-migratie `20261012090000_draft_import`** (kolom `Tool.importSleutel`)
   wordt via de gewone `prisma migrate deploy` toegepast; controleer dat die
   gedraaid heeft.
7. **Storage:** geen wijziging. Logo's bij het overnemen komen in de bestaande
   bucket `product-fotos`.
8. **Firewall-regel** hierboven instellen.

## Acceptatietest

1. *Homepage → rekentool met prijs in ≤ 3 kliks, zonder Supabase-verzoeken* —
   homepage-knop → `/probeer` → "Maak mijn rekentool" → editor met prijs. Met
   Playwright op 390 px gecontroleerd: 0 verzoeken naar Supabase en geen API-
   verzoeken (zonder website-invoer).
2. *Sluiten/heropenen houdt het voorbeeld, wissen start schoon* — gecontroleerd:
   heropenen toont "Verder met je voorbeeld / Opnieuw beginnen"; zonder opgeslagen
   voorbeeld (wissen van siteopslag) toont het gewone formulier (door de code
   gegarandeerd, niet apart doorgeklikt). Verlopen en kapotte
   concepten: unit-tests (`draft-opslag.test.ts`).
3. *localStorage geblokkeerd* — gecontroleerd met een geblokkeerde `localStorage`
   (Playwright): de editor werkt in het geheugen en toont de melding.
4. *Account via Google en e-mail in dezelfde browser* — **niet end-to-end te
   testen zonder database/Supabase in deze omgeving.** Gecontroleerd: panel,
   `next`-doorgifte (unit-tests), schema + import-logica via typecontrole en
   unit-tests. Handmatig na deploy testen.
5. *Gemanipuleerd concept* — `draft.test.ts`: te veel onderdelen, HTML in namen,
   enorme getallen, verkeerd logobestand worden geweigerd of schoongemaakt.
6. *Bestaand account met bedrijf → keuze* — in de code (`importDraftAction` geeft
   `keuze`; scherm in `importeren.tsx`); handmatig na deploy testen.
7. *Branding-endpoint weigert interne adressen* — `branding-extract.ssrf.test.ts`
   (localhost, 127.x, 169.254.x.x, privé-ranges, IPv6, decimale IP, ftp/file/
   javascript).
8. *Gewoon inloggen/registreren zonder captcha en geen restanten* — de code bevat
   geen verwijzingen meer naar anonymous sign-ins, Turnstile, Upstash of de
   cron-job (grep).
