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
- Prisma 7 met SQLite (via `@prisma/adapter-better-sqlite3`)
- Sessie-authenticatie met `jose` (JWT in httpOnly cookie) en `bcryptjs`

## Aan de slag

```bash
npm install
cp .env.example .env      # pas SESSION_SECRET aan voor productie
npx prisma migrate deploy # database aanmaken
npm run dev
```

De app draait daarna op `http://localhost:3000`.

### Scripts

- `npm run dev` — ontwikkelserver
- `npm run build` — productiebuild
- `npm run start` — productieserver
- `npm run lint` — ESLint
- `npx prisma studio` — database inspecteren

## Projectstructuur

- `app/(auth)` — login- en registratiepagina's
- `app/dashboard` — beveiligd hoveniersdashboard (instellingen, categorieën, diensten, producten)
- `app/portaal/[slug]` — het publieke klantenportaal met de kostencalculator
- `app/lib` — Prisma-client, sessiebeheer, server actions en validatie
- `prisma/schema.prisma` — datamodel
