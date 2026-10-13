# Audit: tenant-scoping (companyId / IDOR) in Kostenplan

Auditor: Claude (alleen lezen, geen code gewijzigd). Datum: 2026-10-13.

## Baseline en werkwijze

- Gecontroleerd is de code op `4bf6ffd` (= `main`, "Facturen ... (#66)") plus de fix-commit `f637ca2` op `fix/67-betaling-bedrijfscontrole`. Dat commit raakt in `app/` alleen `app/lib/factuur/beheer.ts` en `app/lib/actions/facturen-versturen.ts` (plus tests). Alle andere bestanden zijn dus identiek voor beide.
- Let op: tijdens de audit stond de gedeelde werkmap tijdelijk op `fix/72-draft-import-transactie` (met niet-gecommitte wijzigingen in `slug.ts` en `draft-import.ts`: alleen `tx` doorgeven aan de slug-generator, geen tenant-effect). De bevindingen voor `beheer.ts` / `facturen-versturen.ts` zijn daarom gecontroleerd via `git show 4bf6ffd:...` en `git show f637ca2:...`.
- Gelezen: alle 35 `"use server"`-bestanden (2 daarvan, `basis-tarieven-server.ts` en `werkzaamheid-db.ts`, noemen de term alleen in commentaar en zijn geen actions), alle 20 `route.ts(x)`, alle `app/dashboard/**/page.tsx`, onboarding-pagina's, publieke pagina's (`/o`, `/f`, `/offerte`, `/offerte-print`, `/embed`, `/t`, `/portaal`, `/voorbeeld`), `dal.ts` en alle library-bestanden die Prisma aanroepen (`grep` op `prisma.`, `prismaBasis.`, `tx.`, `$queryRaw`, `$executeRaw`).
- Raw SQL: 5 plekken (`factuur/beheer.ts` `vergrendel`, `factuur/opslag.ts:87`, `offerte/nummer.ts`, `factuur/nummer.ts`, `draft-import.ts:75` advisory lock, `health` `SELECT 1`). Alle filteren op `companyId` of raken geen tenantdata. Alleen `vergrendel` in beheer.ts controleerde het resultaat niet (zie F-01).
- `prisma` (alle code) is `prismaBasis` plus alleen een snapshot-publicatiehaak; er is **geen** automatische tenantfilter. Elke query moet dus zelf op bedrijf scopen.
- Waar komt het bedrijf vandaan: overal `requireActiveCompany()` / `requireActiveTool()` (sessie + cookie die tegen echte `CompanyMember`-rijen wordt afgedwongen, `dal.ts:67-120`) of `requireMembership(companyId)` (`companies.ts:122`, client-companyId maar gecontroleerd tegen lidmaatschap). Nergens wordt een client-`companyId` zonder controle vertrouwd, behalve bij F-03 en F-04.
- Note Next.js: volgens `node_modules/next/dist/docs/01-app/02-guides/data-security.md` is een geëxporteerde server action ook bereikbaar via directe POST; ongebruikte acties worden uit de client-bundle gehaald (dead code elimination) en action-ID's zijn versleuteld. F-02 t/m F-04 zijn daardoor "defence in depth"-lekken met voorwaarden (zie daar), geen triviaal exploiteerbare gaten.

Legenda oordeel: OK = bedrijf server-side bepaald en elke id-query (direct of via relatie) gescoped; AFWIJKING = gat of ontbrekende scope; ONZEKER = hangt van configuratie/gebruik af.

## (b) Afwijkingen (samenvatting, details onderaan)

| # | Ernst | Plek | Kort |
|---|-------|------|------|
| F-01 | Hoog op `4bf6ffd`; **opgelost** in `f637ca2` | `app/lib/factuur/beheer.ts` (basis: regel 17, 32, 38, 46, 51, 63) en `facturen-versturen.ts:33` (basis) | Betaling/status op factuur van ander bedrijf (issue #67) |
| F-02 | Laag-middel | `app/lib/actions/offertes.ts:334-339` | `syncOfferteVerval(offerte)` is een server action die een client-object vertrouwt |
| F-03 | Laag | `app/lib/actions/onboarding.ts:23-25` | `markOnboardingVoltooid(companyId)` zonder auth, client-companyId |
| F-04 | Laag-middel | `app/lib/actions/analytics.ts:11-17` | `recordAnalyticsEvent(companyId, toolId, type)` zonder auth, client-ids |
| F-05 | Laag | `app/lib/actions/push.ts:17-21` | upsert op globale `endpoint` herschrijft `companyId`/`userId` van bestaande rij |
| F-06 | Laag | `app/lib/storage.ts:107`, gebruikt in `branding.ts:39-41` en `onboarding.ts:91` | `isOwnStorageUrl` controleert bucket, niet de `{companyId}/`-map: cross-tenant bestandsreferentie |
| F-07 | Middel (informatielek) | `app/t/[bedrijfsslug]/[toolslug]/page.tsx:95,109` en `app/portaal/[slug]/page.tsx:91,105` | Account-e-mail van de eigenaar gaat naar anonieme bezoekers, ook als "toon e-mail" uit staat |

## (a) Alle gecontroleerde acties, routes en pagina's

### Server actions (`app/lib/actions/*.ts`)

| Bestand:functie | Leest/wijzigt | Bedrijf komt van | Oordeel | Reden |
|---|---|---|---|---|
| account.ts:updatePasswordAction | Supabase-wachtwoord van gebruiker | `requireUser` | OK | Geen record-id, alleen eigen sessie |
| analytics.ts:recordAnalyticsEvent | `analyticsEvent.create` | **argument van aanroeper (client)** | **AFWIJKING** | F-04: geëxporteerd uit "use server", companyId/toolId niet gecontroleerd |
| analytics.ts:recordPublicAnalyticsEventAction | `analyticsEvent.create` voor publieke tool | `tool.findFirst({id, GEPUBLICEERD})` -> `tool.companyId` | OK | companyId server-side uit de tool afgeleid |
| auth.ts:registerAction / loginAction / requestPasswordResetAction / logoutAction / signInWithGoogleAction | Supabase Auth | n.v.t. | OK | Geen tenantrecords op id |
| branding.ts:updateBrandingAction | `branding.upsert` per tool, logo in storage | `requireActiveTool(toolId)` | OK (+F-06) | Tool gescoped; logo-URL-controle zwak (F-06) |
| calculator-config.ts:saveCalculatorConfigDraftAction | `calculatorConfig.update` (draft.id) | `requireDraftCalculatorConfig` -> `requireActiveTool` | OK | Draft komt uit eigen tool |
| calculator-config.ts:publishCalculatorConfigAction | calculatorConfig/tool updates | idem | OK | `activeCalculatorConfigId` komt uit eigen tool-rij |
| calculator-config.ts:discardCalculatorConfigDraftAction | calculatorConfig read/update | idem | OK | idem |
| calculator-config.ts:upsertProductKeuzeOptiesAction | materialCategory/option CRUD | `requireActiveTool` | OK | Categorie via `product:{toolId}`; optie-id's gefilterd op die categorie |
| calculator-config.ts:schakelUitCalculatorEngineAction | `tool.update` | `requireActiveTool` | OK | |
| companies.ts:createCompanyAction | company+tool create | `requireUser` | OK | Maakt eigen bedrijf |
| companies.ts:switchActiveCompanyAction | cookie | `companyMember.findFirst({userId, companyId})` | OK | Lidmaatschap gecontroleerd; redirect-allowlist |
| companies.ts:updateCompanyDetailsAction | `company.update` | `requireMembership(companyId)` (client-id, server-gecontroleerd) | OK | Lid-check voor elke write. Rol wordt niet gecontroleerd (nu alleen "owner" mogelijk) |
| companies.ts:cancelSubscriptionAction | Mollie + `company.update` + feedback | `requireMembership` | OK | idem |
| companies.ts:pauseSubscriptionAction | idem | `requireMembership` | OK | idem |
| companies.ts:deleteCompanyAction | `company.delete` | `requireMembership` | OK | Plus export-/naamcontrole |
| cost-settings.ts:updateCostSettingsAction | `costSettings.upsert` | `requireActiveTool` | OK | |
| draft-import.ts:importDraftAction | tool/company/product create, logo-upload | `requireUser`/`requireActiveCompany` | OK | Dubbele-import-check gescoped op lidmaatschap; `@@unique([companyId, importSleutel])` |
| extra-options.ts:createExtraOptionAction | `extraOption.create` | `requireActiveCompany` + `product.findFirst({tool:{companyId}})` | OK | |
| extra-options.ts:updateExtraOptionAction | `extraOption.update` | `extraOption.findFirst({product:{tool:{companyId}}})` | OK | |
| extra-options.ts:deleteExtraOptionAction | delete + foto-delete | idem | OK | `deleteFoto` krijgt alleen DB-waarde |
| extra-options.ts:toggleExtraOptionActiveAction | update actief | idem | OK | |
| facturen-beheer.ts:registreerBetalingAction | betaling op factuur | `requireActiveCompany` -> `registreerBetaling(..., companyId)` | OK op `f637ca2` / **AFWIJKING op `4bf6ffd`** | F-01 |
| facturen-beheer.ts:verwijderBetalingAction | betaling delete | idem | OK | `findFirst({id, factuur:{companyId}})`; op basis ook al OK, maar herbereken niet gescoped (F-01) |
| facturen-beheer.ts:maakCreditnotaAction | creditnota-concept | idem | OK op `f637ca2` / AFWIJKING op basis (F-01 vergrendel) | |
| facturen-bewerken.ts:bewaarFactuurAction | `factuur.updateMany({id, companyId, status:CONCEPT})` | `requireActiveCompany` | OK | Scope + status in `where` |
| facturen-versturen.ts:definitiefMakenAction | factuur definitief | `requireActiveCompany` | OK op `f637ca2` / basis: zie F-01 | Basis: `factuur.findUnique({id})` op regel 33 en `herberekenFactuurStatus(..)` zonder company; `maakFactuurDefinitief` ervoor was al gescoped dus basis niet misbruikbaar, wel inconsistent |
| facturen-versturen.ts:maakFactuurDeelklaarAction | PDF + link | `factuur.findFirst({id, companyId})` | OK | `zorgVoorFactuurPdf(..., company.id)` |
| facturen-versturen.ts:bevestigFactuurVerstuurdAction | `factuur.update({id})` | `findFirst({id, companyId})` ervoor, zelfde functie | OK | |
| facturen-versturen.ts:volgendFactuurnummerAction | read teller | `findFirst({id, companyId})`; teller op `company.id` | OK | |
| facturen.ts:maakFactuurUitOfferteAction | factuur-concepten aanmaken | `offerteV2.findFirst({id, companyId})`; leadId uit die offerte | OK | `leadId`/`offerteId` komen niet van de client maar van gescopete offerte |
| facturen.ts:maakEindfactuurAction | idem + eerdere facturen | idem, `factuur.findMany({companyId, offerteId})` | OK | |
| facturen.ts:maakLosseFactuurAction | factuur uit lead | `lead.findFirst({id, companyId})` | OK | Child-id (leadId) gescoped |
| lead-voortgang.ts:zetInContactAction | `lead.update({id})` | `eigenLead()` = `lead.findFirst({id, companyId})`, daarna update | OK | Check in dezelfde aanroepketen, vóór de write |
| lead-voortgang.ts:planInAction / markeerOpgeleverdAction / markeerVerlorenAction / heropenLeadAction | idem | idem | OK | |
| leads.ts:createLeadAction | `lead.create` | publiek; `tool.findFirst({id, GEPUBLICEERD})` in `maakLead` -> `tool.companyId` | OK | companyId nooit van client |
| leads.ts:updateLeadStatusAction | `lead.updateMany({id, companyId})` | `requireActiveCompany` | OK | |
| leads.ts:addLeadNoteAction | `leadNote.create` | `lead.findFirst({id, companyId})` | OK | |
| leads.ts:updateLeadNoteAction | `leadNote.update` | `leadNote.findFirst({id, lead:{companyId}})` | OK | |
| leads.ts:deleteLeadNoteAction | `leadNote.delete` | idem | OK | |
| material-categories.ts:create/update/deleteMaterialCategoryAction | CRUD | `product`/`materialCategory.findFirst` met `tool:{companyId}` | OK | |
| material-options.ts:create/update/delete/toggleMaterialOption* | CRUD | `materialCategory/materialOption.findFirst` met `product:{tool:{companyId}}` | OK | |
| offerte-gegevens.ts:saveOfferteGegevensAction | `offerteGegevens.upsert({companyId})` | `requireActiveCompany` | OK | `logoUrl` niet gevalideerd (geen IDOR, wel opmerking onderaan) |
| offerte-gegevens.ts:uploadVoorwaardenAction / verwijderVoorwaardenAction | upload `{companyId}/voorwaarden`, update | `requireActiveCompany` | OK | |
| offerte-publiek.ts:geefAkkoordAction | offerte-akkoord | publiek, token -> 1 offerte | OK | `laadPubliekeOfferte(token)`; `lead.updateMany({id: o.leadId})` mist `companyId` (aanbeveling: `companyId: o.companyId` toevoegen) |
| offerte-publiek.ts:stelVraagAction / wijsOfferteAfAction | gebeurtenis/status | token | OK | |
| offerte-v2.ts:maakOfferteV2Action | offerte uit lead | `lead.findFirst({id, companyId})` | OK | |
| offerte-v2.ts:bewaarOfferteAction | concept | `bewaarConcept` met `findFirst({id, companyId})` | OK | |
| offerte-v2.ts:nieuweVersieAction | nieuwe versie | `maakNieuweVersie` met `findFirst({id, companyId})` | OK | |
| offerte-v2.ts:slaStandaardRegelOpAction / verwijderStandaardRegelAction | standaardregel | `companyId` uit sessie; delete via `deleteMany({id, companyId})` | OK | |
| offerte-v2.ts:maakDeelklaarAction | PDF klaarzetten | `offerteV2.findFirst({id, companyId})`, daarna `bewaarDeelklaarPdf` | OK | |
| offerte-v2.ts:bevestigVerstuurdAction | vergrendel + status | `findFirst({id, companyId})`; `lead.updateMany({id, companyId})` | OK | |
| offerte-v2.ts:maakHerinneringKlaarAction / bevestigHerinneringAction / markeerOfferteV2GezienAction | herinnering, gezien | `findFirst`/`updateMany` met `companyId` | OK | |
| offertes.ts:omzettenNaarOfferteAction | lead status, redirect | `lead.findFirst({id, companyId})` | OK | |
| offertes.ts:saveOfferteAction / genereerDeelLinkAction / regenereerDeelLinkAction / herberekenOfferteAction / markOffertReactieGezienAction / intrekOfferteAction / deleteOfferteAction | v1-offerte | `offerte.findFirst({id, lead:{companyId}})` (`requireOfferteOwnership`) | OK | Updates op id in dezelfde functie na de check; `lead.findUniqueOrThrow` op `offerte.leadId` van gescopete rij |
| offertes.ts:markExternAfgehandeldAction | lead update | `lead.findFirst({id, companyId})` | OK | |
| offertes.ts:syncOfferteVerval | `offerte.update({id: offerte.id})` | **object van aanroeper** | **AFWIJKING** | F-02 |
| offertes.ts:reageerOpOfferteAction | v1 klantreactie | token (`offerte.findUnique({deelToken})`) | OK | Token = 1 record |
| omzetten.ts:bekijkOmzettingAction / zetOmNaarStandaardblokkenAction | analyse + saves + `product.updateMany({id in ids})` | `requireActiveTool` | OK | `ids` komen uit categorieën met `product:{toolId}` |
| onboarding.ts:markOnboardingVoltooid | `company.update({id: companyId})` | **argument (client)** | **AFWIJKING** | F-03 |
| onboarding.ts:createFirstToolAction | tool create | `requireActiveCompany` | OK | |
| onboarding.ts:applyOnboardingBrandingAction | branding upsert | `requireActiveCompany` + laatste eigen tool | OK (+F-06) | logoUrl via `isOwnStorageUrl` |
| onboarding.ts:createStartpakketAction | producten create | `requireActiveCompany` + laatste eigen tool | OK | |
| onderdelen.ts:duplicateOnderdeelAction | config update + klonen | `requireDraftCalculatorConfig`; bron `materialCategory` via `product:{tool:{companyId}}` | OK | |
| onderdelen.ts:saveOnderdeelBibliotheekAction | bibliotheek create | `requireDraftCalculatorConfig` -> `company.id` | OK | |
| onderdelen.ts:deleteOnderdeelBibliotheekAction | delete | `requireOwnedOnderdeelBibliotheek` | OK | |
| onderdelen.ts:addOnderdeelFromBibliotheekAction | klonen naar tool | beide eigenaarschapschecks | OK | |
| products.ts:createProductAction / createProductDraftAction | product create | `requireActiveTool` | OK | |
| products.ts:updateProductDraftAction | `product.update({id})` | `product.findFirst({id, tool:{companyId}})` in `saveProduct` | OK | |
| products.ts:deleteProductAction / copyProductAction / toggleProductActiveAction | delete/copy/toggle | `product.findFirst({id, tool:{companyId}})` | OK | |
| publicatie.ts:publicatieStatusAction / publiceerOpnieuwAction | snapshot status/publish | `requireActiveTool(toolId)` | OK | |
| push.ts:bewaarPushAbonnementAction | `pushAbonnement.upsert({endpoint})` | sessie | **AFWIJKING (laag)** | F-05 |
| push.ts:verwijderPushAbonnementAction | `deleteMany({endpoint, companyId})` | sessie | OK | |
| push.ts:stuurTestPushAction | push naar eigen bedrijf | sessie | OK | |
| rekentools.ts:hernoem/verwijder/zetWerkzaamhedenVolgorde/slaResultaatPaneelOp/slaAanvraagPaneelOpAction | tool/product/costSettings updates | `requireActiveTool(toolId)`; volgorde-ids gefilterd op `product.findMany({toolId})` | OK | |
| rekentools.ts:herstelRekentoolAction | `tool.update` | `tool.findFirst({id, companyId, deletedAt not null})` | OK | |
| rekentools.ts:kopieerWerkzaamheidAction | product kopie | doel: `requireActiveTool`; bron: `product.findFirst({id, tool:{companyId}})` | OK | Child-id bron gescoped |
| rekentools.ts:maakRekentoolAction | tool create | `requireActiveCompany` | OK | |
| subscription.ts:startCheckoutAction | Mollie + `company.update` | `requireActiveCompany` | OK | |
| tarieven.ts:saveBedrijfTarievenAction | costSettings per eigen tool | `tool.findMany({companyId})` | OK | |
| tools.ts:createToolAction / createToolFromTemplateAction / createModulaireToolFromTemplateAction | tool create | `requireActiveCompany` | OK | |
| tools.ts:duplicateToolAction / softDeleteToolAction | tool copy/delete | `tool.findFirst({id, companyId, deletedAt:null})` | OK | |
| tools.ts:updateToolAction / updateToolStatusAction / updateResultaatConfigAction / updateLeadFormConfigAction / updateEmbedConfigAction | tool updates | `requireActiveTool(toolId)` | OK | |
| werkgebied.ts:slaWerkgebiedOpAction | company/tool werkgebied | `requireActiveCompany`; tool via `findFirst({id, companyId})` | OK | `tool.update({id: bereik.toolId})` op regel 345 komt na die check |
| werkzaamheden.ts:saveWerkzaamheidAction | product + materialen/extras in transactie | `product.findFirst({id, tool:{companyId}})`; child-id's gefilterd op bestaande sets | OK | Client-id's van materialen/extra's buiten de set worden als nieuw behandeld |
| werkzaamheden.ts:createWerkzaamheidAction | product create | `requireActiveTool` | OK | |
| werkzaamheden.ts:setWerkzaamheidActief / deleteWerkzaamheid | update/delete | `product.findFirst({id, tool:{companyId}})` | OK | |
| werkzaamheden.ts:saveTarievenAction | costSettings + company | `requireActiveTool` -> `slaBasisTarievenOp(company.id, toolId)` | OK | |

### Library-functies die door de actions worden aangeroepen

| Bestand:functie | Leest/wijzigt | Bedrijf komt van | Oordeel | Reden |
|---|---|---|---|---|
| factuur/beheer.ts:laadStand | factuur + betalingen | argument | **AFWIJKING op `4bf6ffd:17` / OK op `f637ca2:17-22`** | F-01: `findUniqueOrThrow({id})` -> `findFirst({id, companyId})` + fout |
| factuur/beheer.ts:herberekenFactuurStatus | factuur status | argument | **AFWIJKING op basis (`:31-34`) / OK op `f637ca2`** | F-01 |
| factuur/beheer.ts:vergrendel ($queryRaw FOR UPDATE) | lock | argument | **AFWIJKING op basis (`:38`) / OK op `f637ca2:41-44`** | Resultaat niet gecontroleerd; vreemde factuur gaf lege lock maar ging door |
| factuur/beheer.ts:registreerBetaling | `factuurBetaling.create`, `factuurGebeurtenis.create` | argument | **AFWIJKING op basis (`:45-52`) / OK op `f637ca2:46-59`** | F-01 |
| factuur/beheer.ts:verwijderBetaling | delete betaling | argument | OK (beide) | `findFirst({id, factuur:{companyId}})` vooraf; herbereken pas gescoped op `f637ca2` |
| factuur/beheer.ts:maakCreditnotaConcept | creditnota | argument | OK op `f637ca2` / basis: `findFirst({id, companyId})` ving het al af | Basis: lock zonder check, maar `findFirst` met `companyId` volgde |
| factuur/opslag.ts:maakFactuurConcept | `factuur.create` | argument (callers: gescopete lead/offerte) | OK | `leadId`/`offerteId` altijd van gescopete rij |
| factuur/opslag.ts:bewaarFactuurConcept / verwijderFactuurConcept / slaFactuurPdfOp | updateMany/deleteMany | `{id, companyId, status}` | OK | Scope in `where` |
| factuur/opslag.ts:maakFactuurDefinitief | lock + `update({id})` | argument | OK | Lock met companyId (`:87`), daarna `findFirst({id, companyId})` (`:88`), dan update op id in dezelfde transactie |
| factuur/pdf.ts:zorgVoorFactuurPdf | factuur + pdf | optioneel `companyId` | OK | Alle 5 callers kloppen: dashboard-routes geven `company.id`, `/f/[token]/pdf` geeft id uit token. Ontwerp-opmerking: optionele parameter maakt per ongeluk onbegrensd gebruik mogelijk |
| factuur/pdf.ts:maakFactuurPdf | printtoken | id van gescopete aanroeper | OK | |
| factuur/publiek.ts:laadPubliekeFactuur / registreerFactuurBekeken | factuur op token / bekeken | token (regex 20-64, 192 bit) | OK | 1 record; concept bestaat niet voor klant |
| factuur/export-server.ts:laadExportFacturen / factuurExportStatus | facturen per bedrijf | argument `company.id` | OK | `where.companyId` altijd aanwezig |
| factuur/overzicht.ts:laadFactuurOverzicht | leads+facturen | argument `company.id` | OK | |
| offerte/opslag.ts:bewaarConcept / maakNieuweVersie | offerte(+versie) | `findFirst({id, companyId})` | OK | |
| offerte/opslag.ts:bewaarDeelklaarPdf / vergrendelVersie | `offerteVersie.updateMany({offerteId, versie})` | caller | OK | Beide alleen aangeroepen na `offerteV2.findFirst({id, companyId})` |
| offerte/opslag.ts:maakOfferte | create + teller | argument (gescopete lead) | OK | |
| offerte/publiek.ts:laadPubliekeOfferte | offerte op token | token | OK | 1 record; `versie`-param alleen binnen die offerte |
| offerte/publiek-acties.ts:registreerBekeken / zorgVoorGetekendePdf | status/pdf | id uit token-lookup of gescopete route | OK | |
| offerte/tips.ts / offerte/meldingen.ts / offerte/gegevens-server.ts | read per bedrijf | `companyId` argument | OK | `where.companyId` aanwezig |
| offerte/nummer.ts:volgendeOfferteNummer, factuur/nummer.ts:volgendeFactuurNummer ($queryRaw) | tellers | `companyId` | OK | |
| lead-aanmaken.ts:maakLead | `lead.create` | `tool.companyId` | OK | Idempotentiesleutel is globaal unique: bij botsing krijgt de aanroeper een bestaande `leadId` terug maar geen data |
| basis-tarieven-server.ts:slaBasisTarievenOp | costSettings + company | argumenten, callers valideren | OK | Callers: werkzaamheden, onboarding, tarieven (alle na tool-scoping) |
| rekentool-analyse.ts:analyseerRekentool | tool + materialCategory | `toolId` van `requireActiveTool` | OK | categorie via `product:{toolId}` |
| snapshot/publiceer.ts:publiceerTool / publiceerMetHerhaling | tool snapshot | `toolId` | OK | Callers: scoped actions, cron (CRON_SECRET), embed-pagina (publiek, alleen herpubliceren van bestaande tool) |
| mail/lead-mail.ts / mail/afwijzing-mail.ts / push/versturen.ts | lead/push | `leadId`/`companyId` uit interne flows | OK | Alleen server-intern aangeroepen |
| storage.ts:deleteFoto / isOwnStorageUrl | storage | pad uit URL | **AFWIJKING (laag)** | F-06 |
| pdf-token.ts:maakPrintToken / leesPrintToken | HMAC-token | `OFFERTE_PDF_SECRET` ?? `DATABASE_URL` ?? "lokaal" | ONZEKER | Sterk zolang `OFFERTE_PDF_SECRET` of `DATABASE_URL` is gezet; zonder beide is het token forgeerbaar (`:12`). Alleen lokaal relevant |

### dal.ts (`app/lib/dal.ts`)

| Functie | Leest/wijzigt | Bedrijf komt van | Oordeel | Reden |
|---|---|---|---|---|
| requireActiveCompany | memberships | sessie + cookie, `resolveActiveMembership` | OK | Cookie wordt genegeerd als hij geen lidmaatschap is |
| requireActiveTool | tool | `findFirst({id, companyId, deletedAt:null})` | OK | |
| requireOwnedOnderdeelBibliotheek / getOnderdeelBibliotheekVoorCompany | bibliotheek | `companyId` | OK | |
| requireDraftCalculatorConfig | draft + publicatie | via `requireActiveTool` | OK | `findUnique` op `tool.activeCalculatorConfigId` komt uit gescopete tool |
| canCreateTool / canPublishTool | counts | `companyId` | OK | |
| getToolForPublicRoute / getLegacyToolForCompanySlug / getToolForEmbed | publiek | slug/toolId | OK | Publiek ontwerp; zie F-07 voor wat de pagina's ermee doen |
| getToolForSnapshot | tool incl. relaties | `toolId` (geen scope) | OK | Alleen server-intern (`publiceerTool`) |
| getMateriaalOptiesVoorEngineVelden | materialCategory | `product:{toolId}` | OK | Cross-tool/cross-tenant categorie-id's leveren niets |
| getArbeidStapEenheid | costSettings | `toolId` | ONZEKER | Geen callers gevonden; zonder scope, bij hergebruik eerst `requireActiveTool` |
| getProductPricingSettings / getToolCostSettings / getBasisTarievenStatus | costSettings | `toolId` van gescopete caller | OK | Alle callers na `requireActiveTool`/bedrijfstools. `getBasisTarievenStatus` heeft geen callers |
| getDashboardStats / listToolsVoorCompany / getLeadsPageData | tellers/lijsten | `companyId` | OK | |
| getToolOverzichtStats | `product/lead` op `toolId` | `toolId` (geen scope) | ONZEKER | Ongebruikte export zonder scope; bij hergebruik zonder `requireActiveTool` direct een lek |

### API-routes (`app/**/route.ts`)

| Route | Leest/wijzigt | Bedrijf/identificatie | Oordeel | Reden |
|---|---|---|---|---|
| api/facturen/[id]/pdf GET | factuur-PDF | `requireActiveCompany`; `findFirst({id, companyId})` | OK | Printtoken pas daarna |
| api/facturen/export GET | facturen/ZIP/CSV | `requireActiveCompany`; `laadExportFacturen(company.id)`, `zorgVoorFactuurPdf(.., company.id)` | OK | `status` uit querystring gaat ongevalideerd (`as never`) naar Prisma: ongeldige waarde geeft 500, geen lek |
| api/offertes/[id]/pdf GET | offerte-PDF | `offerteV2.findFirst({id, companyId})`; versie en akkoord via `offerteId` van gescopete rij | OK | |
| api/embed/lead POST | `lead.create` | publiek; `toolId` uit body -> `tool.companyId` | OK | companyId nooit uit body |
| api/branding/extract POST | extractie + upload | `requireActiveCompany`; upload naar `{company.id}/` | OK | |
| api/branding/voorbeeld POST | geen DB | geen | OK | SSRF-beveiliging zit in `extractBranding` |
| api/mollie/webhook POST | company updates | metadata uit Mollie-API (server-side gezet) of `mollieCustomerId` | OK | Payload bevat alleen payment-id; status wordt bij Mollie opgehaald |
| api/cron/ingest, leadmail, snapshots GET | batchjobs | `CRON_SECRET` bearer | OK | Fail-closed als secret ontbreekt |
| api/indexnow GET/POST | geen tenantdata | bearer-secret | OK | |
| api/landing-event POST | alleen log | geen | OK | |
| api/health GET | `SELECT 1` | geen | OK | |
| api/search-index, api/og/landing, api/offertes/voorbeeld/[naam], llms.txt | geen DB / alleen vlag `OFFERTE_VOORBEELDEN` | geen | OK | Voorbeeld-route staat uit tenzij env-vlag |
| auth/callback GET | Supabase sessie | code | OK | `next`-param wordt genormaliseerd |
| f/[token]/pdf GET | factuur-PDF | token (regex) -> `factuur.findUnique({token})`, geen concept | OK | 1 record |
| o/[token]/pdf GET | offerte-PDF | token via `laadPubliekeOfferte`; versie alleen die offerte | OK | `?getekend=1` vereist akkoord op die offerte |

### Pagina's (server components)

| Pagina | Leest | Bedrijf/identificatie | Oordeel | Reden |
|---|---|---|---|---|
| dashboard/page.tsx | `getDashboardStats`, `laadVandaag`, `markOnboardingVoltooid(company.id)` | `requireActiveCompany` | OK | (F-03 over de aangeroepen action) |
| dashboard/layout.tsx | lead count | `company.id` | OK | |
| dashboard/leads/page.tsx | `getLeadsPageData(company.id)`, tips | `requireActiveCompany` | OK | `?lead=` wordt alleen client-side tegen de eigen lijst gebruikt |
| dashboard/leads/[leadId]/offerte/page.tsx | lead, offerte(+versies), branding | `lead.findFirst({id, companyId})`; child-reads via `offerteId`/`lead.toolId` van die rij | OK | |
| dashboard/facturen/page.tsx | `laadExportFacturen(company.id, ...)` | `requireActiveCompany` | OK | `status` gevalideerd via allowlist |
| dashboard/facturen/[factuurId]/page.tsx | factuur | `factuur.findFirst({id, companyId})` | OK | |
| dashboard/tools/page.tsx | tools, `lead.groupBy` | `companyId` in alle queries | OK | |
| dashboard/tools/nieuw/page.tsx, abonnement/page.tsx, branding/page.tsx, bedrijven/nieuw/page.tsx | formulier/redirect | geen id | OK | |
| dashboard/tools/[toolId]/layout.tsx | costSettings | `requireActiveTool` | OK | |
| dashboard/tools/[toolId]/page.tsx -> `laadEditorProps` | tool, producten, branding, costSettings | `requireActiveTool` | OK | Page heeft zelf geen check, maar `laadEditorProps` roept `requireActiveTool` als eerste aan (niet leunen op layout) |
| dashboard/tools/[toolId]/bouwer/page.tsx | tool, draft, branding | `requireActiveTool` + `requireDraftCalculatorConfig` | OK | |
| dashboard/tools/[toolId]/prijzen/page.tsx | costSettings, counts | `requireActiveTool` | OK | |
| dashboard/tools/[toolId]/producten/[id]/uitgebreid/page.tsx | product | `requireActiveTool`; `product.findFirst({id, toolId})` | OK | |
| dashboard/tools/[toolId]/{aanvraagformulier,calculator,embed,instellingen,producten,producten/nieuw,producten/[id]/bewerken,publiceren,resultaat,uiterlijk}/page.tsx | alleen `redirect()` | geen DB | OK | `werkzaamheid:<id>` wordt URL-encoded doorgestuurd en later in de editor-action gescoped |
| dashboard/profiel/page.tsx en profiel/{abonnement,account,bedrijfsgegevens,huisstijl,meldingen,offerte-instellingen,tarieven,werkgebied}/page.tsx | `laadProfiel()` | `requireActiveCompany`; tools/ids komen uit eigen lijst | OK | `searchParams` bevatten geen record-ids |
| onboarding/{bedrijf,huisstijl,rekentool,werkzaamheden,klaar}/page.tsx | eigen laatste tool | `companyId` in `where` | OK | `?over=` alleen tegen preset-allowlist |
| voorbeeld/[toolId]/page.tsx | tool + producten (editor-iframe) | `requireActiveTool(toolId)` | OK | |
| f/[token]/page.tsx | publieke factuur | token -> 1 factuur | OK | Alleen `inhoud` + totalen naar client; geen companyId |
| o/[token]/page.tsx | publieke offerte v2 | token -> 1 offerte | OK | `?v=` binnen dezelfde offerte |
| offerte/[token]/page.tsx | publieke v1-offerte | `deelToken` -> 1 offerte | OK | Roept `syncOfferteVerval` server-side direct aan (zie F-02 voor de action-blootstelling); e-mail/telefoon alleen bij `toon*` |
| offerte-print/[token]/page.tsx | offerte/factuur voor PDF | HMAC-token, TTL 180 s, ids in token | OK | Tokens worden alleen na gescopete check uitgegeven; zie ONZEKER bij `pdf-token.ts` |
| embed/[toolId]/page.tsx | snapshot of DB-fallback | `toolId` (cuid, publiek ontwerp) | OK | `beschikbaar` gate; e-mail/telefoon gated op `toon*` in `bouwSnapshotInhoud`. Anonieme bezoeker kan een snapshot-herpublicatie triggeren (geen datalek) |
| t/[bedrijfsslug]/[toolslug]/page.tsx | tool op slugs | slugs | OK voor id-scoping, **AFWIJKING (informatielek)** | F-07 |
| portaal/[slug]/page.tsx | eerste gepubliceerde tool op bedrijfsslug | slug | OK voor id-scoping, **AFWIJKING (informatielek)** | F-07 |
| probeer/*, zz-preview/*, demo/*, marketing- en kennisbankpagina's, sitemap.ts | geen tenantdata (sitemap: gepubliceerde tools) | geen | OK | `probeer/importeren` vereist `requireUser`; import zelf in `importDraftAction` |

## (b) Afwijkingen in detail

### F-01 Factuurbeheer controleerde het bedrijf niet (issue #67) - opgelost in `f637ca2`

Op `4bf6ffd` (en dus `main`):
- `app/lib/factuur/beheer.ts:17` `laadStand()` laadt met `db.factuur.findUniqueOrThrow({ where: { id: factuurId } })`, zonder `companyId`.
- `app/lib/factuur/beheer.ts:38` `vergrendel()` gaf het `$queryRaw`-resultaat terug zonder te controleren of er een rij is. Voor een factuur van een ander bedrijf is het resultaat leeg, de transactie ging gewoon door.
- `app/lib/factuur/beheer.ts:45-52` `registreerBetaling()`: na de ongecontroleerde `vergrendel` en `laadStand` volgen `factuurBetaling.create({ factuurId })` en `factuurGebeurtenis.create({ factuurId })` zonder scope; `herberekenFactuurStatus` (`:31-34`) deed `factuur.update({ where: { id } })`.
- `app/lib/actions/facturen-versturen.ts:33` (basis) laadde `creditVoorId` met `factuur.findUnique({ where: { id: factuurId } })` en riep `herberekenFactuurStatus(prismaBasis, credit.creditVoorId)` zonder bedrijf aan.

Reproductie: hovenier B roept `registreerBetalingAction({ factuurId: <id van factuur van A>, bedragCenten, datum, methode })` aan (server action, id uit een gelekte link of een gok). `requireActiveCompany()` geeft B's bedrijf, `registreerBetaling(prismaBasis, { ...p.data, companyId: B })`. De lock op `(id, companyId=B)` levert 0 rijen en wordt genegeerd, `laadStand` leest A's factuur, `valideerBetaling` slaagt, en er komt een betaling plus tijdlijnregel op A's factuur en A's status verandert (bijv. BETAALD).

Fix (toegepast in `f637ca2`, beoordeeld als volledig): `laadStand(db, factuurId, companyId)` met `findFirst({ id, companyId })` en `BeheerFout("Factuur niet gevonden.")`; `vergrendel` gooit bij 0 rijen; `herberekenFactuurStatus(db, id, companyId)`; `definitiefMakenAction` gebruikt `findFirst({ id, companyId })`. Ik vond op `f637ca2` geen restant: `verwijderBetaling` was al gescoped via `factuur:{companyId}`, `maakCreditnotaConcept` en `maakFactuurDefinitief` hebben `findFirst` met `companyId`. De regressietests in `beheer.test.ts` dekken betaling, verwijderen, creditnota, herberekenen/laadStand en definitief maken.

### F-02 `syncOfferteVerval` is een server action die een client-object vertrouwt

`app/lib/actions/offertes.ts:334-339`: `export async function syncOfferteVerval(offerte: Offerte)` staat in een `"use server"`-bestand en doet `prisma.offerte.update({ where: { id: offerte.id }, data: { status: "VERLOPEN" } })` zonder auth of eigenaarscheck, op basis van `offerte.status` en `offerte.geldigTot` uit het meegegeven object.
Reproductie: wie de action-ID kent (alleen gebruikt door `app/offerte/[token]/page.tsx` op de server, dus normaal gesproken uit de client-bundle gestript; zie Next-docs hierboven) POST `{ id: <offerte-id van iemand anders>, status: "VERSTUURD", geldigTot: <datum in het verleden> }` en zet een verstuurde v1-offerte van een ander bedrijf op VERLOPEN.
Fix: verplaats naar een niet-"use server" module (bijv. `app/lib/offertes-server.ts`), of laat hem alleen een `id` nemen en de rij zelf laden met `where: { id, status: "VERSTUURD", geldigTot: { lt: new Date() } }` via `updateMany`.

### F-03 `markOnboardingVoltooid(companyId)` zonder auth

`app/lib/actions/onboarding.ts:23-25`: `prisma.company.update({ where: { id: companyId }, data: { onboardingVoltooid: true } })`, geëxporteerd uit een `"use server"`-bestand, `companyId` is een argument. Enige aanroeper: `app/dashboard/page.tsx:36` (server component).
Reproductie: directe POST naar deze action met het id van een ander bedrijf zet diens `onboardingVoltooid` op true (verbergt de onboarding-checklist). Impact klein, patroon fout.
Fix: verplaats naar een gewone module (geen "use server") of laat de functie `requireActiveCompany()` aanroepen en `company.id` gebruiken (geen argument).

### F-04 `recordAnalyticsEvent(companyId, toolId, type)` zonder auth

`app/lib/actions/analytics.ts:11-17`: geëxporteerde functie in een `"use server"`-bestand maakt `analyticsEvent.create({ data: { companyId, toolId, type } })` met client-ids; het commentaar zegt "interne helper" maar de export maakt hem een action. Interne callers: `lead-aanmaken.ts:114` en `recordPublicAnalyticsEventAction`.
Reproductie: (met action-ID) willekeurige LEAD/VISIT-events voor een willekeurige company/tool schrijven en zo de statistieken en conversieratio van een ander bedrijf vervalsen.
Fix: verplaats naar een module zonder "use server" (bijv. `app/lib/analytics-schrijf.ts` met `import "server-only"`), laat `recordPublicAnalyticsEventAction` de enige export blijven.

### F-05 Push-abonnement: upsert op globale `endpoint` herschrijft eigenaar

`app/lib/actions/push.ts:17-21`: `pushAbonnement.upsert({ where: { endpoint }, update: { companyId: company.id, userId: user.id, ... } })`; `endpoint` is globaal unique (`prisma/schema.prisma:997`). Een bestaande rij van een ander bedrijf wordt zo overgenomen.
Reproductie: B registreert dezelfde `endpoint`-URL als een toestel van A (vereist kennis van die geheime push-URL, daarom laag); daarna ontvangen A's toestel B's meldingen en A's meldingen stoppen.
Fix: in de `update`-tak niets aan `companyId`/`userId` wijzigen als de rij van een ander bedrijf is: eerst `findUnique({ endpoint })`; bij `companyId !== company.id` weigeren (of `deleteMany({ endpoint, companyId: ander })` uitsluiten), of unique maken op `(companyId, endpoint)`.

### F-06 `isOwnStorageUrl` controleert de bucket maar niet de bedrijfsmap

`app/lib/storage.ts:107-109` accepteert elke URL die `/object/public/product-fotos/` bevat. Gebruikt in `branding.ts:39-41` (`extractedLogoUrl`, client-formdata) en `onboarding.ts:91` (`logoUrl`). Uploads staan in `{companyId}/...` (`storage.ts:50`).
Reproductie: B stuurt `extractedLogoUrl = <publieke URL van A's logo>` (A's logo is op A's publieke rekentool te zien); B's branding verwijst nu naar A's bestand. Bij een volgende "verwijder logo"-actie door B roept `resolveLogo` `deleteFoto(currentLogo)` aan met A's pad (`branding.ts:29`/`:40`). Dat verwijdert A's bestand alleen als de Storage-RLS (README, per-company policy) dat toelaat; app-niveau is er geen controle.
Fix: `isOwnStorageUrl(url, companyId)` laten eisen dat het pad na de marker met `${companyId}/` begint (ook in `deleteFoto` als guard), en dat de URL naar het eigen Supabase-project wijst.

### F-07 Publieke rekentool-pagina's sturen het account-e-mailadres mee, onafhankelijk van "toon e-mail"

`app/t/[bedrijfsslug]/[toolslug]/page.tsx:95,109` en `app/portaal/[slug]/page.tsx:91,105` geven `email={tool.company.creator.email}` als prop aan de client-components `Calculator`/`EngineCalculator`. Die tonen het adres alleen als `branding.toonEmail` aan staat (`calculator.tsx:182`), maar het zit altijd in de HTML/RSC-payload voor anonieme bezoekers. Het snapshot-pad (`snapshot/bouw.ts:42`) doet het wel goed (`branding?.toonEmail ? ... : null`), dus de DB-paden wijken af. Ook `branding.telefoonnummer` gaat mee zonder `toonTelefoonnummer`-filter (voor de overige brandingvelden is dat bedoeld).
Reproductie: open `/t/<bedrijf>/<tool>` of `/portaal/<slug>` van een bedrijf met "toon e-mail" uit en bekijk de pagina-bron: het inlogadres van de eigenaar staat in de payload.
Fix: `email={tool.branding?.toonEmail ? tool.company.creator.email : null}` (prop-type `string | null`) en idem voor telefoon; of beide uit `PUBLIEKE_TOOL_INCLUDE` halen en alleen via de gated contact-structuur doorgeven.

## Overige opmerkingen (geen afwijking)

- `app/lib/actions/offerte-gegevens.ts:39`: `logoUrl` wordt als vrije string opgeslagen en later in offerte/PDF (headless Chromium) gerenderd. Geen IDOR, wel een invoervalidatie-aanrader (alleen eigen storage-URL, zie F-06).
- `app/lib/actions/offerte-publiek.ts:58`: `lead.updateMany({ id: o.leadId })` zonder `companyId`; `leadId` komt van de offerte (aangemaakt met gescopete lead) dus niet misbruikbaar, maar `companyId: o.companyId` toevoegen is goedkope extra zekerheid.
- `companies.ts`: alle leden mogen opzeggen/verwijderen (rol wordt niet getoetst); nu bestaan er alleen `owner`-leden. Zodra uitnodigen van medewerkers komt, rol-check toevoegen.
- Tokens: factuur- en v2-offertetokens zijn `randomBytes(24)` base64url (192 bit) met regex-controle; v1 `deelToken` is `crypto.randomUUID()` (122 bit). Elk token opent precies één record; er is geen enumeratie of onderscheidbare fout tussen "bestaat niet" en "van ander bedrijf".
- Idempotentiesleutel van leads (`Lead.idempotentieSleutel`, globaal unique) kan bij een botsing een `leadId` van een andere tool teruggeven aan de aanroeper (alleen gebruikt voor `dubbel`-detectie, niets uitgelezen).

## Telling

(zie einde van het antwoord; aantallen rijen: server actions per functie/functiegroep, library, dal, routes, pagina's)
