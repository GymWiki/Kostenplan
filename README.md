# Kostenplan

Kostenplan is een webapp waarmee hoveniers een eigen online kostencalculator maken. Klanten
gebruiken de calculator om zelf een indicatie te krijgen van wat het aanleggen van hun tuin gaat
kosten, gebaseerd op vier instelbare kostenposten: **arbeidskosten**, **transportkosten**,
**voorrijkosten** en **materiaalkosten**.

## Functionaliteit

- **Account & dashboard** — elke hovenier registreert een eigen bedrijfsaccount.
- **Kosteninstellingen** — arbeidskosten, transportkosten (vast of per km), voorrijkosten en
  materiaalkosten (met opslagpercentage) zijn elk afzonderlijk aan of uit te zetten en in te
  stellen, plus een btw-percentage.
- **Arbeidskosten in stappen** — arbeid wordt gerekend in uren, dagdelen of dagen. Bij dagdelen/
  dagen wordt de totale arbeidstijd van alle gekozen diensten en producten samen naar boven
  afgerond op hele stappen, niet per item apart.
- **Diensten** — werkzaamheden met arbeidstijd en materiaalkosten per eenheid.
- **Producten** — samengestelde producten (bijv. "Schutting") opgebouwd uit materiaalcategorieën
  (bijv. "Palen", "Tussenbekleding") met per categorie een keuze uit materialen, plus optionele
  extra opties die de klant kan aanvinken. Een product kan een arbeidscapaciteit hebben (bijv.
  "5 m1 per dagdeel") en materialen kunnen een stapgrootte hebben (bijv. verkocht per 1,8 m) —
  de bestelde hoeveelheid wordt dan naar boven afgerond op een veelvoud daarvan.
- **Zichtbaarheid per kostenpost** — elke kostenpost is niet alleen aan/uit te zetten, maar ook
  los "zichtbaar voor klant" te maken: verborgen kosten tellen nog gewoon mee in het totaal, maar
  verschijnen niet als aparte regel in de uitsplitsing.
- **Klantenportaal** — elk account krijgt een unieke, deelbare link (`/portaal/<slug>`) waar
  klanten hun tuinproject samenstellen en live een kostenraming zien. De link staat prominent op
  het dashboard, inclusief kopieerknop.
- **Icoon per dienst/product** — optioneel een icoon kiezen uit een tuin-/hoveniersgerichte set,
  zichtbaar in het dashboard en het klantenportaal.
- **Foto per materiaal/extra optie** — optioneel een foto uploaden (max 5MB, JPG/PNG/WEBP/GIF).
  Zodra minstens één materiaal in een categorie een foto heeft, toont het klantenportaal die
  categorie als een grid met keuzekaarten in plaats van een dropdown. Vereist eenmalige setup van
  een Supabase Storage-bucket, zie [Supabase Storage instellen (foto's)](#supabase-storage-instellen-fotos).

## Techstack

- [Next.js](https://nextjs.org) 16 (App Router, Server Actions, Turbopack)
- React 19, TypeScript, Tailwind CSS 4
- [Supabase](https://supabase.com) — Postgres-database én authenticatie (`@supabase/ssr`)
- Prisma 7 als ORM bovenop de Supabase Postgres-database (via `@prisma/adapter-pg`)

### Hoe database en auth samenwerken

Supabase Auth beheert accounts, wachtwoorden en sessies (tabel `auth.users`, buiten Prisma's
bereik). Direct na een geslaagde registratie maakt een server action een bijbehorende rij aan in
onze eigen `User`-tabel (via Prisma), met hetzelfde `id` als de Supabase-gebruiker. Die tabel
bevat de app-specifieke gegevens: bedrijfsnaam, portaal-slug, kosteninstellingen, diensten en
producten.

## Aan de slag (lokaal)

1. **Supabase-project aanmaken**: ga naar [supabase.com/dashboard](https://supabase.com/dashboard)
   → New Project (gratis tier is voldoende).
2. **Sleutels ophalen**: Project Settings → API — kopieer de **Project URL** en de **anon
   public key**.
3. **Database-connectiestring ophalen**: klik de groene **Connect**-knop bovenaan het dashboard →
   tab **Session pooler** (poort 5432). Gebruik niet de "Direct connection" — die host
   (`db.<project-ref>.supabase.co`) is IPv6-only en werkt niet vanaf de meeste IPv4-only
   netwerken/CI-omgevingen.
4. **Environment variables instellen**:
   ```bash
   cp .env.example .env
   # vul NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY en DATABASE_URL in
   ```
5. **Installeren en migreren**:
   ```bash
   npm install
   npx prisma migrate deploy   # maakt de app-tabellen aan in je Supabase-database
   npm run dev
   ```

De app draait daarna op `http://localhost:3000`.

> **E-mailbevestiging**: Supabase vereist standaard dat een nieuwe gebruiker zijn e-mailadres
> bevestigt voordat hij kan inloggen. Voor snel lokaal testen kun je dit uitzetten via
> Authentication → Providers → Email → "Confirm email".

## Supabase Storage instellen (foto's)

Optioneel: alleen nodig als je foto's bij materialen/extra opties wilt kunnen uploaden. Zonder
deze stap werkt de rest van de app gewoon, maar geeft een upload-poging de foutmelding "Uploaden
is mislukt."

1. Ga in het Supabase-dashboard naar **Storage** → **New bucket**.
2. Naam: `product-fotos` (moet exact zo heten, zie `app/lib/storage.ts`). Zet **Public bucket**
   aan — de foto's moeten zonder inloggen zichtbaar zijn in het klantenportaal.
3. Ga naar **Storage** → **Policies** (of **Authentication** → **Policies** → tabel
   `storage.objects`, afhankelijk van je Supabase-versie) en voeg voor de bucket `product-fotos`
   de volgende policies toe. Elke policy scoped op de eigen map van de gebruiker
   (`{auth.uid()}/...`), zodat een hovenier alleen zijn eigen foto's kan uploaden/verwijderen:

   ```sql
   -- Uploaden
   create policy "Eigen fotos uploaden"
   on storage.objects for insert
   to authenticated
   with check (
     bucket_id = 'product-fotos'
     and (storage.foldername(name))[1] = auth.uid()::text
   );

   -- Vervangen (upsert)
   create policy "Eigen fotos vervangen"
   on storage.objects for update
   to authenticated
   using (
     bucket_id = 'product-fotos'
     and (storage.foldername(name))[1] = auth.uid()::text
   );

   -- Verwijderen
   create policy "Eigen fotos verwijderen"
   on storage.objects for delete
   to authenticated
   using (
     bucket_id = 'product-fotos'
     and (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

   Een expliciete SELECT-policy is niet nodig: bij een public bucket zijn objecten sowieso te
   benaderen via de publieke URL (`getPublicUrl()`), ongeacht RLS-policies op `storage.objects`.

### Scripts

- `npm run dev` — ontwikkelserver
- `npm run build` — productiebuild (draait ook `prisma generate` via `postinstall`)
- `npm run start` — productieserver
- `npm run lint` — ESLint
- `npm run db:deploy` — migraties handmatig toepassen (`prisma migrate deploy`)
- `npm run vercel-build` — wat Vercel gebruikt: migraties toepassen én bouwen in één stap
- `npx prisma studio` — database inspecteren

## Deployen naar Vercel

1. **Supabase-project**: volg stap 1-3 hierboven als je dat nog niet gedaan hebt.
2. **Project importeren**: ga naar [vercel.com/new](https://vercel.com/new), importeer deze
   GitHub-repository en kies de branch die je wilt deployen. Next.js wordt automatisch herkend.
3. **Environment variables**: zet in de Vercel-projectinstellingen dezelfde drie waarden als in
   `.env` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`).
4. **Build Command overschrijven**: Project Settings → Build & Development Settings → Build
   Command → override aanzetten → vul in `npm run vercel-build`. Hierdoor draait
   `prisma migrate deploy` automatisch vóór elke build, dus elke push naar de gekoppelde branch
   houdt de databasetabellen vanzelf up-to-date — geen handmatige stap meer nodig.
   > Let op: dit voert migraties uit op elke deploy die dit Build Command gebruikt (dus ook
   > preview-deployments als die dezelfde `DATABASE_URL` gebruiken). Voor een solo-project is dat
   > geen probleem; bij een team met meerdere omgevingen kun je per environment een eigen
   > `DATABASE_URL` instellen.
5. **Redirect-URL toevoegen**: zet in Supabase onder Authentication → URL Configuration je
   Vercel-domein (`https://<project>.vercel.app`) bij Site URL / Redirect URLs, anders werken
   e-mailbevestigingslinks niet.
6. **Deploy**: Vercel bouwt en deployt automatisch. Je krijgt een `https://<project>.vercel.app`
   URL die je in de browser kunt openen.

## Projectstructuur

- `app/(auth)` — login- en registratiepagina's
- `app/dashboard` — beveiligd hoveniersdashboard (instellingen, diensten, producten)
- `app/portaal/[slug]` — het publieke klantenportaal met de kostencalculator
- `app/lib/supabase` — Supabase server client
- `app/lib/actions` — server actions (auth, kosteninstellingen, diensten, producten en de
  materiaalcategorieën/materialen/extra opties daarbinnen)
- `app/lib/dal.ts` — leest de ingelogde Supabase-gebruiker en koppelt die aan het Prisma `User`-profiel
- `prisma/schema.prisma` — datamodel van de app-tabellen (niet van Supabase Auth)
