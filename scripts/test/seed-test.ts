// Vaste testdata voor de testomgeving (nooit op productie draaien). Maakt:
//  • hovenier A (Pro, twee bedrijven) in drie identieke kopieën (a1, a2, a3) zodat parallelle agents elkaars data niet raken
//  • hovenier B (Gratis, één rekentool, ontbrekende bedrijfsgegevens)
//  • een lege nieuwe gebruiker (alleen een inlog; het bedrijf maakt hij zelf aan)
// Gebruik: DATABASE_URL=postgresql://postgres@127.0.0.1:5433/kp npx tsx --conditions=react-server scripts/test/seed-test.ts
// Schrijft de ids naar test-results/seed.json.
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../app/generated/prisma/client";
import { HOVENIER_PRESETS, presetNaarDraft } from "../../app/lib/presets";
import { productCreateData } from "../../app/lib/werkzaamheid-db";
import { werkgebiedInstellingenSchema } from "../../app/lib/werkgebied/schema";
import { AFZENDER_OK, factuurInhoud, regel } from "../../app/lib/factuur/test-helpers";
import { eenFactuurUitOfferte, termijnFactuurUitOfferte } from "../../app/lib/factuur/maak";
import { maakFactuurConcept, maakFactuurDefinitief } from "../../app/lib/factuur/opslag";
import { herberekenFactuurStatus, maakCreditnotaConcept, registreerBetaling } from "../../app/lib/factuur/beheer";
import { berekenTotalen } from "../../app/lib/offerte/bereken";
import type { OfferteInhoud } from "../../app/lib/offerte/model";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { userId, GEBRUIKERS } = require("./ids.js");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const dag = (plus: number) => new Date(Date.now() + plus * 86_400_000);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const token = () => randomBytes(24).toString("base64url");
type Uit = Record<string, unknown>;

async function maakGebruiker(email: string) {
  await db.user.create({ data: { id: userId(email), email } });
  return userId(email);
}

async function maakTool(companyId: string, naam: string, slug: string, presets: string[], order: number, opties: { status?: "GEPUBLICEERD" | "CONCEPT"; werkgebied?: unknown } = {}) {
  const t = await db.tool.create({ data: { companyId, naam, slug, status: opties.status ?? "GEPUBLICEERD", order } });
  await db.branding.create({ data: { toolId: t.id, toonTelefoonnummer: true, telefoonnummer: "06 12345678", toonEmail: true } });
  await db.costSettings.create({ data: { toolId: t.id } });
  let i = 0;
  const productIds: string[] = [];
  for (const pid of presets) {
    const p = HOVENIER_PRESETS.find((x) => x.id === pid)!;
    const prod = await db.product.create({ data: productCreateData(t.id, presetNaarDraft(p, "DAGDEEL"), p, i++, {}) });
    productIds.push(prod.id);
  }
  return { id: t.id, productIds };
}

async function gegevens(companyId: string, opties: { kor?: boolean; handelsnaam: string }) {
  const A = AFZENDER_OK;
  await db.offerteGegevens.create({
    data: { companyId, handelsnaam: opties.handelsnaam, kvkNummer: A.kvkNummer, adresRegel: A.adresRegel, postcode: A.postcode, plaats: A.plaats, btwId: opties.kor ? null : A.btwId, korActief: Boolean(opties.kor), iban: A.iban, ibanTenaamstelling: opties.handelsnaam, telefoon: A.telefoon, email: A.email, contactNaam: A.contactNaam, contactFunctie: A.contactFunctie },
  });
}

let offerteTeller = 0;
// Een lead, optioneel met offerte (v2) en akkoord.
async function lead(c: { companyId: string; toolId: string; toolNaam: string; productId?: string; prefix: string; afzender?: Partial<typeof AFZENDER_OK> }, o: { naam: string; status?: "NIEUW" | "IN_BEHANDELING" | "OFFERTE_VERSTUURD" | "GEWONNEN" | "VERLOREN"; offerte?: "CONCEPT" | "VERSTUURD" | "VERLOPEN" | "AFGEWEZEN" | "GEACCEPTEERD"; zakelijk?: boolean; extra?: Record<string, unknown>; ouderDagen?: number }) {
  const l = await db.lead.create({
    data: {
      companyId: c.companyId,
      toolId: c.toolId,
      toolNaamSnapshot: c.toolNaam,
      naam: o.naam,
      email: `${o.naam.toLowerCase().replace(/[^a-z]+/g, ".")}@example.nl`,
      telefoonnummer: "06 87654321",
      status: o.status ?? "NIEUW",
      totaalIndicatie: 4537.97,
      createdAt: dag(-(o.ouderDagen ?? 3)),
      idempotentieSleutel: `${c.prefix}-${randomBytes(12).toString("hex")}`,
      snapshot: { regels: [{ naam: "Bestrating / terras", type: "dienst", aantal: 24, eenheid: "m²", materiaal: "Gebakken klinkers", prijs: 3750.4, productId: c.productId }], arbeidskosten: 1500, materiaalkosten: 2100, transportkosten: 150, voorrijkosten: 35, subtotaal: 3750.4, btw: 787.58, totaal: 4537.97 },
      ...(o.extra ?? {}),
    },
  });
  let offerte: { id: string; versieId: string; inhoud: OfferteInhoud } | null = null;
  if (o.offerte) {
    const regels = [
      regel("a", "Bestrating terras, gebakken klinkers", 24, 7345, 21, { eenheid: "m²", soort: "materiaal" }),
      regel("b", "Arbeid bestrating", 6, 21000, 21, { eenheid: "dagdeel", soort: "arbeid" }),
      regel("c", "Haag planten, Carpinus betulus", 17, 1899, 9, { eenheid: "stuks", soort: "planten" }),
      { ...regel("d", "Grondwerk en afvoer", 1, 40000, 21), type: "stelpost" as const },
      { ...regel("e", "Verlichting", 1, 25000, 21), type: "optioneel" as const },
    ];
    const nummer = `2026-${String(100 + ++offerteTeller).padStart(4, "0")}`;
    const base = factuurInhoud({ zakelijk: o.zakelijk, afzender: c.afzender, kor: Boolean(c.afzender?.korActief) });
    const inhoud = { ...base, factuur: undefined, nummer, versie: 1, klant: { ...base.klant, naam: o.naam, email: l.email }, secties: [{ id: "s1", titel: "Tuin Kerkstraat 5", regels }], betaaltermijnen: [{ label: "Aanbetaling", percentage: 30 }, { label: "Bij oplevering", percentage: 70 }], voorwaarden: [], herroeping: { aan: false, tekst: "" } } as unknown as OfferteInhoud;
    const t = berekenTotalen({ ...inhoud, secties: [{ id: "s1", titel: "x", regels: regels.filter((r) => r.type !== "optioneel") }] });
    const verstuurd = o.offerte !== "CONCEPT";
    const geldigTot = o.offerte === "VERLOPEN" ? dag(-5) : dag(25);
    const rij = await db.offerteV2.create({
      data: {
        companyId: c.companyId, leadId: l.id, nummer, token: token(),
        status: o.offerte === "VERLOPEN" ? "VERSTUURD" : o.offerte,
        verstuurdOp: verstuurd ? dag(-12) : null,
        geldigTot: o.offerte === "CONCEPT" ? null : geldigTot,
        versies: { create: { versie: 1, inhoud: { ...inhoud, geldigTot: iso(geldigTot) } as object, totaalExclCenten: t.totaalExcl, totaalInclCenten: t.totaalIncl, vergrendeld: verstuurd, verstuurdOp: verstuurd ? dag(-12) : null, pdfHash: verstuurd ? "testhash" : null } },
        gebeurtenissen: verstuurd ? { create: [{ soort: "VERZONDEN", versieNummer: 1 }, ...(o.offerte === "AFGEWEZEN" ? [{ soort: "AFGEWEZEN" as const, versieNummer: 1, tekst: "Te duur" }] : []), ...(o.offerte === "GEACCEPTEERD" ? [{ soort: "BEKEKEN" as const, versieNummer: 1 }, { soort: "AKKOORD" as const, versieNummer: 1 }] : [])] } : undefined,
      },
      include: { versies: true },
    });
    if (o.offerte === "GEACCEPTEERD") {
      await db.offerteAkkoord.create({ data: { offerteId: rij.id, versieId: rij.versies[0].id, naam: o.naam, versieNummer: 1, gekozenRegelIds: ["e"], totaalInclCenten: t.totaalIncl, pdfHash: "testhash" } });
    }
    offerte = { id: rij.id, versieId: rij.versies[0].id, inhoud };
  }
  return { id: l.id, offerteId: offerte?.id ?? null, inhoud: offerte?.inhoud ?? null };
}

// Facturen bij een geaccepteerde offerte. dagenGeleden bepaalt factuur- en vervaldatum (14 dagen betaaltermijn).
async function factuur(c: { companyId: string; leadId: string; offerteId: string; inhoud: OfferteInhoud }, o: { soort: "totaal" | "termijn"; dagenGeleden: number; definitief?: boolean; verstuurd?: boolean; betaald?: boolean }) {
  const bron = { inhoud: c.inhoud, gekozenOptioneel: ["e"], nummer: c.inhoud.nummer, versie: 1 };
  const inst = { betaaltermijnDagen: 14, nu: dag(-o.dagenGeleden) };
  const gebouwd = o.soort === "totaal" ? eenFactuurUitOfferte(bron, inst) : termijnFactuurUitOfferte(bron, { label: "Aanbetaling", percentage: 30 }, inst);
  const inh = { ...gebouwd, afzender: AFZENDER_OK, factuur: { ...gebouwd.factuur, uitvoeringVan: iso(dag(-o.dagenGeleden - 3)) } };
  inh.secties = inh.secties.map((s) => ({ ...s, regels: s.regels.map((r) => (r.label === "stelpost-open" ? { ...r, aantal: 1.5, label: undefined } : r)) }));
  const f = await maakFactuurConcept(db, { companyId: c.companyId, leadId: c.leadId, offerteId: c.offerteId, offerteVersie: 1, inhoud: inh });
  if (o.definitief) {
    await maakFactuurDefinitief(db, { factuurId: f.id, companyId: c.companyId, afzender: AFZENDER_OK, prefix: { factuur: "F", credit: "C" } });
    if (o.verstuurd) await db.factuur.update({ where: { id: f.id }, data: { status: "VERSTUURD", verstuurdOp: dag(-o.dagenGeleden), gebeurtenissen: { create: { soort: "VERZONDEN", tekst: "via mail" } } } });
    if (o.betaald) {
      const t = await db.factuur.findUniqueOrThrow({ where: { id: f.id }, select: { totaalInclCenten: true } });
      await registreerBetaling(db, { factuurId: f.id, companyId: c.companyId, bedragCenten: t.totaalInclCenten, datum: iso(dag(-o.dagenGeleden + 5)) });
    }
  }
  return f.id;
}

async function seedA(n: number) {
  const email = GEBRUIKERS[`a${n}`];
  const uid = await maakGebruiker(email);
  const out: Uit = { email, userId: uid };
  const instellingen = werkgebiedInstellingenSchema.parse({
    werkgebied: { aan: true, methode: "STRAAL", start: { postcode: "8011AB", huisnummer: "5", toevoeging: "", straat: "Voorstraat", plaats: "Zwolle", lat: 52.5168, lon: 6.083 }, straalKm: 30, buiten: "TOESLAG", toeslag: { modus: "PER_KM", perKmEuro: 0.5, zones: [{ totKm: 40, bedragEuro: 35 }, { totKm: null, bedragEuro: null }] } },
    minimum: { aan: true, bedragEuro: 1500, gedrag: "TARIEF" },
  });
  const c1 = await db.company.create({
    data: { naam: "Hoveniersbedrijf De Vries", slug: `devries-a${n}`, createdBy: uid, subscriptionTier: "PRO", subscriptionStatus: "ACTIVE", onboardingVoltooid: true, onboardingPortaalBekeken: true, werkgebied: instellingen as object, members: { create: { userId: uid } } },
  });
  await gegevens(c1.id, { handelsnaam: "Hoveniersbedrijf De Vries" });
  const t1 = await maakTool(c1.id, "Tuinaanleg", `tuinaanleg-a${n}`, ["bestrating", "schutting", "graszoden", "kunstgras", "boom-planten", "haag-beplanting"], 0);
  const t2 = await maakTool(c1.id, "Onderhoud", `onderhoud-a${n}`, ["tuinonderhoud", "vlonder", "grondwerk-afvoer"], 1);
  const ctx = { companyId: c1.id, toolId: t1.id, toolNaam: "Tuinaanleg", productId: t1.productIds[0], prefix: `a${n}` };

  const leads: Record<string, string> = {};
  const L = async (sleutel: string, o: Parameters<typeof lead>[1]) => {
    const r = await lead(ctx, o);
    leads[sleutel] = r.id;
    return r;
  };
  await L("nieuw", { naam: "Nina Nieuw", ouderDagen: 0 });
  await L("in-contact", { naam: "Ilse in Contact", status: "IN_BEHANDELING", extra: { inContactOp: dag(-2) } });
  await L("offerte-concept", { naam: "Cor Concept", status: "IN_BEHANDELING", offerte: "CONCEPT" });
  await L("offerte-verstuurd", { naam: "Vera Verstuurd", status: "OFFERTE_VERSTUURD", offerte: "VERSTUURD" });
  await L("offerte-verlopen", { naam: "Vincent Verlopen", status: "OFFERTE_VERSTUURD", offerte: "VERLOPEN", ouderDagen: 40 });
  await L("afgewezen", { naam: "Anna Afgewezen", status: "OFFERTE_VERSTUURD", offerte: "AFGEWEZEN" });
  await L("akkoord", { naam: "Ahmed Akkoord", status: "GEWONNEN", offerte: "GEACCEPTEERD", zakelijk: true });
  await L("ingepland", { naam: "Iris Ingepland", status: "GEWONNEN", offerte: "GEACCEPTEERD", extra: { ingeplandStartweek: "2026-W45", ingeplandOp: dag(-1) } });
  const opl = await L("opgeleverd", { naam: "Olaf Opgeleverd", status: "GEWONNEN", offerte: "GEACCEPTEERD", extra: { ingeplandStartweek: "2026-W41", opgeleverdOp: new Date(`${iso(dag(-3))}T00:00:00Z`) } });
  const facturen: Record<string, string> = {};
  facturen["concept"] = await factuur({ companyId: c1.id, leadId: opl.id, offerteId: opl.offerteId!, inhoud: opl.inhoud! }, { soort: "totaal", dagenGeleden: 0 });
  const gef = await L("gefactureerd", { naam: "Gerrit Gefactureerd", status: "GEWONNEN", offerte: "GEACCEPTEERD", extra: { opgeleverdOp: new Date(`${iso(dag(-8))}T00:00:00Z`) } });
  facturen["verstuurd"] = await factuur({ companyId: c1.id, leadId: gef.id, offerteId: gef.offerteId!, inhoud: gef.inhoud! }, { soort: "totaal", dagenGeleden: 4, definitief: true, verstuurd: true });
  const laat = await L("te-laat", { naam: "Lotte Laat", status: "GEWONNEN", offerte: "GEACCEPTEERD", extra: { opgeleverdOp: new Date(`${iso(dag(-45))}T00:00:00Z`) } });
  facturen["te-laat"] = await factuur({ companyId: c1.id, leadId: laat.id, offerteId: laat.offerteId!, inhoud: laat.inhoud! }, { soort: "totaal", dagenGeleden: 30, definitief: true, verstuurd: true });
  const bet = await L("betaald", { naam: "Bas Betaald", status: "GEWONNEN", offerte: "GEACCEPTEERD", extra: { opgeleverdOp: new Date(`${iso(dag(-30))}T00:00:00Z`) } });
  facturen["betaald"] = await factuur({ companyId: c1.id, leadId: bet.id, offerteId: bet.offerteId!, inhoud: bet.inhoud! }, { soort: "totaal", dagenGeleden: 25, definitief: true, verstuurd: true, betaald: true });
  const cr = await L("creditnota", { naam: "Carla Credit", status: "GEWONNEN", offerte: "GEACCEPTEERD", extra: { opgeleverdOp: new Date(`${iso(dag(-20))}T00:00:00Z`) } });
  facturen["credit-orig"] = await factuur({ companyId: c1.id, leadId: cr.id, offerteId: cr.offerteId!, inhoud: cr.inhoud! }, { soort: "totaal", dagenGeleden: 15, definitief: true, verstuurd: true });
  const orig = await db.factuur.findUniqueOrThrow({ where: { id: facturen["credit-orig"] }, select: { inhoud: true } });
  const regelId = (orig.inhoud as unknown as { secties: { regels: { id: string }[] }[] }).secties[0].regels[2].id;
  const credit = await maakCreditnotaConcept(db, { factuurId: facturen["credit-orig"], companyId: c1.id, regelIds: [regelId], instellingen: { betaaltermijnDagen: 14 } });
  await maakFactuurDefinitief(db, { factuurId: credit.id, companyId: c1.id, afzender: AFZENDER_OK, prefix: { factuur: "F", credit: "C" } });
  await herberekenFactuurStatus(db, facturen["credit-orig"]);
  facturen["creditnota"] = credit.id;
  await L("verloren", { naam: "Vic Verloren", status: "VERLOREN", offerte: "VERSTUURD", extra: { verlorenReden: "Te duur", verlorenOp: dag(-1) } });
  // een lead buiten het werkgebied en een onder het minimum, zoals de rekentool ze aanlevert
  await L("buiten-werkgebied", { naam: "Bob Buiten", extra: { snapshot: { regels: [{ naam: "Schutting", type: "dienst", aantal: 20, eenheid: "m", prijs: 2400 }], arbeidskosten: 1000, materiaalkosten: 1000, transportkosten: 0, voorrijkosten: 0, subtotaal: 1983, btw: 417, totaal: 2400, locatie: { postcode: "3511AB", huisnummer: "12", toevoeging: "", straat: "Domplein", plaats: "Utrecht", lat: 52.0907, lon: 5.1214, afstandKm: 85, binnenWerkgebied: false, markeringen: ["BUITEN_WERKGEBIED"], gecontroleerd: true } } } });

  const c2 = await db.company.create({ data: { naam: "Groenstijl Tuinen", slug: `groenstijl-a${n}`, createdBy: uid, subscriptionTier: "PRO", subscriptionStatus: "ACTIVE", onboardingVoltooid: true, onboardingPortaalBekeken: true, members: { create: { userId: uid } } } });
  await gegevens(c2.id, { handelsnaam: "Groenstijl Tuinen", kor: true });
  const t3 = await maakTool(c2.id, "Heggen en bomen", `heggen-a${n}`, ["haag-beplanting", "boom-planten"], 0);
  const ctx2 = { companyId: c2.id, toolId: t3.id, toolNaam: "Heggen en bomen", productId: t3.productIds[0], prefix: `a${n}b`, afzender: { handelsnaam: "Groenstijl Tuinen", ibanTenaamstelling: "Groenstijl Tuinen", btwId: "", korActief: true } };
  await lead(ctx2, { naam: "Hans Heg" });
  await lead(ctx2, { naam: "Gina Groen", status: "OFFERTE_VERSTUURD", offerte: "VERSTUURD" });

  // Publieke tokens voor de online offerte- en factuurpagina's.
  const factuurTokens: Record<string, string> = {};
  for (const [k, id] of Object.entries(facturen)) factuurTokens[k] = (await db.factuur.findUniqueOrThrow({ where: { id }, select: { token: true } })).token;
  const offerteTokens: Record<string, string> = {};
  for (const [k, leadId] of Object.entries(leads)) {
    const o = await db.offerteV2.findFirst({ where: { leadId }, select: { token: true } });
    if (o) offerteTokens[k] = o.token;
  }
  Object.assign(out, { factuurTokens, offerteTokens, tuinaanlegSlug: `tuinaanleg-a${n}`, bedrijfSlug: `devries-a${n}` });
  Object.assign(out, { company1: c1.id, company2: c2.id, tools: { tuinaanleg: t1.id, onderhoud: t2.id, heggen: t3.id }, products: t1.productIds, leads, facturen });
  return out;
}

async function seedB() {
  const email = GEBRUIKERS.b;
  const uid = await maakGebruiker(email);
  const c = await db.company.create({ data: { naam: "Tuinman Bakker", slug: "bakker-b", createdBy: uid, subscriptionTier: "GRATIS", subscriptionStatus: "GEEN", onboardingVoltooid: true, onboardingPortaalBekeken: true, members: { create: { userId: uid } } } });
  const t = await maakTool(c.id, "Mijn rekentool", "mijn-rekentool-b", ["schutting"], 0);
  return { email, userId: uid, company1: c.id, tools: { rekentool: t.id } };
}

async function main() {
  const uit: Uit = {};
  for (const n of [1, 2, 3]) uit[`a${n}`] = await seedA(n);
  uit.b = await seedB();
  uit.nieuw = { email: GEBRUIKERS.nieuw };
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync("test-results/seed.json", JSON.stringify(uit, null, 2));
  console.log("seed klaar → test-results/seed.json");
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
