# Plan: rekentool maken zonder account (/probeer)

Fase 0 — onderzoek en plan. Nog geen code. Wacht op akkoord (zie "Beslissingen").

## 1. Supabase-docs (nagelezen, actuele versie)
- **Anonymous sign-ins**: `signInAnonymously()` maakt een gewone user met rol `authenticated` en JWT-claim `is_anonymous: true`. Moet in het dashboard aan staan. Standaard IP-limiet: 30 aanmeldingen per uur (instelbaar).
- **Misbruik**: Supabase raadt Turnstile/hCaptcha sterk aan, want anonieme users zijn echte rijen in `auth.users`.
- **Omzetten naar permanent account**: identity linking. E-mail: `updateUser({ email })` (stuurt bevestigingsmail; user blijft hetzelfde id). Google: `linkIdentity({ provider: 'google' })`. Vereist dat **manual linking** aan staat in het dashboard.
- **Bestaand e-mailadres/Google-account**: `updateUser` geeft dan een fout. Supabase laat dit bewust aan ons: de gast moet inloggen op het bestaande account, en wij moeten de data zelf overzetten (docs noemen overschrijven / behouden / samenvoegen). Dat is precies het "Inloggen en dit voorbeeld toevoegen"-scenario uit de opdracht.
- **Opruimen**: geen automatische opruiming; de docs geven een `delete from auth.users where is_anonymous is true and created_at < …` als voorbeeld.
- **Captcha**: één instelling voor het hele project. Staat captcha aan, dan eist Supabase een token bij **alle** sign-up/sign-in/wachtwoord-reset/anonymous-calls.

### Valkuilen voor dit project
1. **Captcha geldt voor ook de bestaande login/registreren/wachtwoord-vergeten.** Zet ik Supabase-captcha aan, dan moeten die formulieren ook een (onzichtbaar) Turnstile-token meesturen, anders kan niemand meer inloggen. Zet ik het niet aan, dan kan iedereen met de publieke anon-key rechtstreeks `/auth/v1/signup` (anoniem) aanroepen en onze Turnstile-check omzeilen. Aanbeveling: aanzetten en overal Turnstile toevoegen.
2. **`User.email` is `@unique` en wordt in `ensureProfile` met `""` aangemaakt.** Tweede gast = unique-violation. Oplossing: gasten krijgen `gast-<id>@gast.invalid` als tijdelijke waarde, en bij koppelen wordt het echte adres overgenomen.
3. **RLS doet hier niets.** De app praat via Prisma als `postgres`-rol (eigenaar, valt buiten RLS); alle tabellen hebben RLS aan zonder policies. Autorisatie zit volledig in `requireActiveTool` / `requireActiveCompany` / server actions. De opdracht vraagt "RLS + server-side"; hier wordt het: RLS blijft dichtgetimmerd (geen policies, dus ook gasten komen niet via de Data API bij tabellen) en de echte afdwinging komt in de server-code. De `is_anonymous`-controle in SQL-policies zou dode code zijn. Wel nodig: Storage-policies (logo's) ook voor gasten naar eigen bedrijf, en geen schrijfrechten buiten dat pad.
3b. Er is **geen service-role key** in de code. Opruimen van `auth.users` en Storage kan via Prisma raw SQL (postgres-rol leest `auth.users`) voor de database, en voor Storage-bestanden is de service-role key of een SQL-delete op `storage.objects` nodig (ik kies SQL via de postgres-rol; geen nieuwe geheimen).
4. **`/auth/callback` neemt `next` ongecontroleerd over** (open redirect). Ik valideer die tot interne paden voordat ik hem voor de koppel-flow gebruik.
5. **Magic link naar dezelfde gast-sessie** kan alleen als de gast zijn e-mail via `updateUser` koppelt (dat is dezelfde identity-link). "Stuur mij een link" = e-mail koppelen zonder verder iets te doen; dan is het eigenlijk al een account. Zie beslissing 4.
6. **Embed-code**: `embedEnabled` staat nu alleen voor **Pro**. De opdracht belooft de embed-code direct na aanmelden op het gratis abonnement. Zie beslissing 1.
7. **Geen mailprovider in de code** (alleen Supabase-auth-mails). De herinneringsmail op dag 5 heeft een provider nodig. Zie beslissing 3.

## 2. Huidige situatie
- **Auth**: Supabase SSR (`app/lib/supabase/server.ts`), `proxy.ts` beschermt `/dashboard`, `/onboarding`, `/voorbeeld`. Registreren = e-mail+wachtwoord (`registerAction`), Google via `/auth/callback`. Geen bedrijf bij registratie; `requireActiveCompany` stuurt naar `/onboarding/bedrijf`, `createCompanyAction` maakt bedrijf + eerste rekentool.
- **Autorisatie**: `dal.ts` (`requireUser` → `ensureProfile` upsert `User`; `requireActiveCompany`; `requireActiveTool`; `canCreateTool`).
- **Branding**: `POST /api/branding/extract` (ingelogd, 10/uur via `BrandingExtractionAttempt` per user), `extractBranding()` met SSRF-bescherming (private IP-ranges, localhost, redirects hercontroleren, timeout, max bytes) en logo-upload naar bucket `product-fotos`.
- **Editor**: `RekentoolEditor` krijgt alle gegevens als props en praat via server actions; al ontworpen met een `voorbeeldUrl`-prop. Preview-iframe `/voorbeeld/[toolId]`.
- **Limieten**: `PLAN_LIMITS.GRATIS` = 1 rekentool, 10 werkzaamheden (account-breed), geen embed.
- **Analytics**: `AnalyticsEvent` is per tool/bedrijf (VISIT/START/COMPLETE/LEAD). Past niet voor een anonieme funnel; er komt een aparte tabel.

## 3. Ontwerp

### Gast herkennen (één plek)
`requireUser()` krijgt `isGast` uit `user.is_anonymous` (Supabase-user, niet uit de DB). Nieuwe helpers in `dal.ts`: `requireVolledigAccount()` (redirect/403 voor gasten) en `isGast()`. **Alle** acties en routes die gasten niet mogen gebruiken roepen `requireVolledigAccount()` aan; de rest blijft werken zoals nu. Lijst om af te dekken: embed-code (pagina + `getToolEmbedCode`), publiceren (`updateToolStatusAction`), leads/offertes (alle `leads`/`offertes` acties), Mollie/abonnement, tweede rekentool/bedrijf (`createToolAction`, `maakRekentoolAction`, `duplicateToolAction`, `createCompanyAction`, `copy`), `/dashboard/*` buiten de editor, bedrijfsswitcher, profiel. Publiek renderen van de gast-tool: `/t/…`, `/embed/…`, `/portaal/…` tonen niets voor een tool van een gast-bedrijf (404). De editor-iframe `/voorbeeld/[toolId]` blijft werken voor de eigenaar.

### Datamodel (alleen toevoegingen)
- `Company.gastVerlooptOp DateTime?`: gezet bij gast-bedrijf, leeg gemaakt bij koppelen. Dient voor opruimen en de "7 dagen"-tekst.
- `GastGebeurtenis` (id, type, sessieHash, bron, utmSource/Medium/Campaign, metSite Boolean, createdAt): funnel zonder persoonsgegevens. `sessieHash` = hash van de user-id met een dagzout; geen IP, geen e-mail.
- `GastRateLimit` (sleutel = hash van IP + soort, venster, teller) voor de limieten per IP (sessie starten 5/uur, branding 10/uur). Alternatief Upstash; zie beslissing 5.
- `User.email`: ongewijzigd; gasten krijgen `gast-<id>@gast.invalid`.

### Gast-sessie starten
Server action `startGastSessieAction(turnstileToken, {site, bron})`: (1) Turnstile server-side verifiëren, (2) IP-limiet, (3) `signInAnonymously({ options: { captchaToken } })` met de server-client (cookies worden gezet), (4) in één transactie `User` + `Company` (`naam` "Mijn hoveniersbedrijf", `gastVerlooptOp = nu+7d`) + `Tool` + `CostSettings` + `Branding`. Gast-sessie start dus pas bij "Maak mijn rekentool", niet bij paginabezoek. `/probeer` is publiek; `/probeer/…` na aanmaken gaat naar `/probeer/editor`.

### Branding-extractie voor gasten
Hergebruik `extractBranding(url, companyId)`; de route-handler krijgt een gast-variant: limiet per IP i.p.v. per user, geen `BrandingExtractionAttempt` van een niet-bestaand `userId`. SSRF-bescherming bestaat al en wordt in de tests expliciet voor `localhost`, `127.0.0.1`, `10.x`, `169.254.169.254`, `[::1]` en redirect-naar-intern gedekt (acceptatietest 5). Extra: strikt http/https en poorten 80/443, en een lagere paginagrootte/time-out voor gasten.

### Editor hergebruiken (geen tweede versie)
`RekentoolEditor` krijgt één extra prop `gast?: { verlooptOp, onAccountMaken }` en een `bron`-object van server actions. Gast-wijzigingen:
- bovenbalk "Dit is een voorbeeld…" met "Account maken";
- "Zet op mijn website" opent `PaneelAccountMaken` i.p.v. `PaneelWebsite`;
- geen hoofdmenu: de gast-pagina staat in een eigen minimale layout (`app/probeer/editor/layout.tsx`) met logo en "Inloggen";
- start in modus "Uitproberen" met 20 m²/10 m voorbeeld en knop "Prijzen aanpassen";
- menu zonder dupliceren/verwijderen, geen "Aangepast", geen kopiëren uit andere rekentool, geen leads.
De actions die de editor gebruikt (`saveWerkzaamheidAction`, `createWerkzaamheidAction`, …) halen al het bedrijf uit de sessie via `requireActiveCompany`; ze werken dus voor gasten zodra `requireActiveCompany` een gast-bedrijf geeft. `requireActiveCompany` stuurt een gast nooit naar `/onboarding/bedrijf`.

### Koppelen aan een account
- **Google**: `linkIdentity({ provider: 'google', options: { redirectTo: /auth/callback?next=/probeer/klaar } })`. Zelfde user-id; `callback` zet `Company.gastVerlooptOp = null`, werkt `User.email` bij en stelt een bedrijfsnaam voor uit `extractBranding().companyName`.
- **E-mail**: `updateUser({ email })` → bevestigingsmail met link naar dezelfde sessie.
- **Bestaand account**: `updateUser`/`linkIdentity` faalt met een identity-/e-mail-bestaat-al fout. Dan tonen we "Inloggen en dit voorbeeld toevoegen aan je account" (inloggen via magic link/Google; daarna `neemGastRekentoolOverAction(gastUserId, doelBedrijfId)` verplaatst de rekentool, mits het abonnement van het bestaande bedrijf nog ruimte heeft; anders keuze "weggooien" of "upgraden") of "Voorbeeld weggooien". Nooit stil overschrijven. De overname vraagt een bewijs van de gast-sessie (ondertekende, kortlevende token in een httpOnly-cookie) omdat de gast-sessie na inloggen vervangen wordt.
- **Na koppelen**: rekentool blijft CONCEPT; stap "Zet op je website" met embed-code (zie beslissing 1).

### Opruimen
`/api/cron/gast-opruimen` (Vercel cron, dagelijks, `CRON_SECRET`): zoekt `auth.users` met `is_anonymous` en `created_at < nu-7d`, verwijdert eerst Storage-objecten van hun bedrijf (`product-fotos/<companyId>/…`), dan `Company` (cascade naar tool, producten, branding), `User` en tot slot de `auth.users`-rij. Telt en logt per run. Gekoppelde accounts hebben `is_anonymous = false` en blijven ongemoeid (test).

### Meten
Eén server action `logGastGebeurtenis(type, bron)` (en `utm`/`site`-vlag uit een cookie die `/probeer` zet). Admin-overzicht `/admin/probeer` alleen voor jouw user-id (env `ADMIN_USER_IDS`): funnel per week en per bron.

### Bestanden (verwacht)
Nieuw: `app/probeer/*` (start, editor-layout, klaar), `app/lib/gast.ts`, `app/lib/turnstile.ts`, `app/lib/rate-limit.ts`, `app/lib/actions/gast.ts`, `app/api/cron/gast-opruimen/route.ts`, `app/admin/probeer/*`, `vercel.json`, migratie (`gastVerlooptOp`, `GastGebeurtenis`, `GastRateLimit`).
Aangepast: `dal.ts`, `proxy.ts` (publiek `/probeer`, geen sessie-refresh-stoornis), `supabase/config.toml` (anonymous, manual linking, captcha), login/registreer/wachtwoord-forms (Turnstile), `/auth/callback`, `rekentool-editor.tsx` (gast-prop), `PaneelWebsite`/nieuw `PaneelAccountMaken`, branding-route, sitemap, homepage + hovenierlandingspagina's (CTA), `README`.

### Risico's
- **Misbruik/kosten**: Turnstile + IP-limieten + 7 dagen + opruimjob; branding-extractie is het duurste (netwerk + Storage); aparte, strengere IP-limiet.
- **Datalekken**: gast-IDs zijn cuids; elke query gaat via `requireActiveTool`. Test met tweede anonieme sessie tegen elke route (acceptatietest 4).
- **Bestaande gebruikers**: Turnstile op login is de grootste regressiekans (test 7); feature-flag via env zodat het zonder deploy uit kan.
- **Eén IP voor veel mensen** (kantoor/mobiel): 5/uur kan echte gebruikers raken; Turnstile eerst, limiet daarna.

## 4. Fasering
1 gast-sessie+beveiliging (migratie, helpers, Turnstile, limieten, afdwinging) → 2 /probeer → 3 editor als gast → 4 koppelen → 5 opruimen → 6 meten. Na elke fase: tsc, eslint, tests, korte samenvatting.

## Beslissingen die ik van je nodig heb
1. **Embed op Gratis?** Nu alleen Pro. Voor "direct na aanmelden de embed-code" moet `embedEnabled` voor GRATIS aan (en dan is Pro minder onderscheidend), óf de gast ziet de code pas na upgrade. Mijn advies: embed aan voor Gratis, met "Powered by Kostenplan" zoals nu al op Gratis.
2. **Captcha** voor het hele project (Turnstile op login/registreren/wachtwoord-vergeten). Jij moet een Cloudflare-Turnstile site key + secret aanmaken en in Supabase (Auth → Attack protection) en Vercel (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`) zetten.
3. **Mailprovider** voor de herinneringsmail op dag 5 (bijv. Resend): wil je die, of laten we die mail vervallen?
4. **"Stuur mij een link"**: dat wordt technisch een gekoppeld e-mailadres zonder wachtwoord (de gast is dan formeel een gewone gebruiker met een rekentool in concept). Dan geldt de 7-dagen-opruiming niet meer. Akkoord? Alternatief: link is een ondertekende hervat-link naar de gast-sessie, zonder account; dan blijft het een gast tot dag 7.
5. **Rate limits**: eigen tabel in Postgres (geen nieuwe dienst) of Upstash/Vercel KV?
6. **Dashboard-instellingen** (aanzetten: anonymous sign-ins, manual linking, captcha) kan ik niet zelf doen: ik zet ze in `supabase/config.toml` voor `supabase config push`, jij moet de push draaien of het in het dashboard aanvinken.
