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
- **Categorieën, diensten en producten** — volledige vrijheid om het aanbod in te richten:
  diensten met arbeidsuren en materiaalkosten per eenheid, en producten met een prijs per eenheid.
- **Klantenportaal** — elk account krijgt een unieke, deelbare link (`/portaal/<slug>`) waar
  klanten hun tuinproject samenstellen en live een kostenraming zien, uitgesplitst per
  kostenpost. De link staat prominent op het dashboard, inclusief kopieerknop.

## Techstack

- [Next.js](https://nextjs.org) 16 (App Router, Server Actions, Turbopack)
- React 19, TypeScript, Tailwind CSS 4
- Prisma 7 met PostgreSQL (via `@prisma/adapter-pg`)
- Sessie-authenticatie met `jose` (JWT in httpOnly cookie) en `bcryptjs`

## Aan de slag (lokaal)

Je hebt een PostgreSQL-database nodig (lokaal, of gratis bijv. via [Neon](https://neon.tech)).

```bash
npm install
cp .env.example .env      # vul DATABASE_URL en SESSION_SECRET in
npx prisma migrate deploy # tabellen aanmaken
npm run dev
```

De app draait daarna op `http://localhost:3000`.

### Scripts

- `npm run dev` — ontwikkelserver
- `npm run build` — productiebuild (draait ook `prisma generate` via `postinstall`)
- `npm run start` — productieserver
- `npm run lint` — ESLint
- `npm run db:deploy` — migraties toepassen (`prisma migrate deploy`)
- `npx prisma studio` — database inspecteren

## Deployen naar Vercel

1. **Database**: maak een gratis Postgres-database aan, bijv. via [Neon](https://neon.tech) of de
   Vercel Postgres-integratie (Storage → Postgres in je Vercel-project). Kopieer de
   connectiestring.
2. **Project importeren**: ga naar [vercel.com/new](https://vercel.com/new), importeer deze
   GitHub-repository en kies de branch die je wilt deployen. Next.js wordt automatisch herkend.
3. **Environment variables**: zet in de Vercel-projectinstellingen:
   - `DATABASE_URL` — de connectiestring uit stap 1
   - `SESSION_SECRET` — een lange willekeurige string (bijv. `openssl rand -base64 32`)
4. **Migraties toepassen**: eenmalig (en na elke schemawijziging) de tabellen aanmaken op de
   productie-database:
   ```bash
   DATABASE_URL="<jouw-connectiestring>" npm run db:deploy
   ```
5. **Deploy**: Vercel bouwt en deployt automatisch. Je krijgt een `https://<project>.vercel.app`
   URL die je in de browser kunt openen.

## Projectstructuur

- `app/(auth)` — login- en registratiepagina's
- `app/dashboard` — beveiligd hoveniersdashboard (instellingen, categorieën, diensten, producten)
- `app/portaal/[slug]` — het publieke klantenportaal met de kostencalculator
- `app/lib` — Prisma-client, sessiebeheer, server actions en validatie
- `prisma/schema.prisma` — datamodel
