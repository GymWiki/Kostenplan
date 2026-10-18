import type { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { planGlobaleWissel, planUrenWissel, convertTarief, schoon, type GlobaleWissel, type PlanProduct, type UrenConfig, type UrenWissel, type WerktempoEenheid } from "@/app/lib/werktempo";

// Database-kant van het werktempo in uur/dagdeel/dag: alles wat meerdere rijen in één transactie omzet. Geen "use server":
// de acties in app/lib/actions/werktempo.ts doen eerst de autorisatie en roepen dit aan.

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type Db = Tx | typeof prisma;

export async function laadPlanProducten(db: Db, toolId: string): Promise<PlanProduct[]> {
  const producten = await db.product.findMany({
    where: { toolId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      naam: true,
      werktempoEenheid: true,
      productiviteit: true,
      arbeidTariefOverride: true,
      materiaalCategorieen: { select: { materialen: { select: { id: true, productiviteitOverride: true } } } },
    },
  });
  return producten.map((p) => ({
    id: p.id,
    naam: p.naam,
    eenheid: p.werktempoEenheid,
    werktempo: p.productiviteit,
    arbeidTariefOverride: p.arbeidTariefOverride,
    materiaalTempos: p.materiaalCategorieen.flatMap((c) => c.materialen.map((m) => ({ id: m.id, werktempo: m.productiviteitOverride }))),
  }));
}

export async function laadUren(db: Db, companyId: string): Promise<UrenConfig> {
  const c = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { urenPerDagdeel: true, urenPerDag: true } });
  return { urenPerDagdeel: c.urenPerDagdeel, urenPerDag: c.urenPerDag };
}

// Het tarief dat nu per `eenheid` geldt (bij uur kan dat het bedrijfstarief zijn).
export function huidigTarief(cs: { arbeidStapEenheid: WerktempoEenheid; arbeidTariefUur: number; arbeidTariefDagdeel: number; arbeidTariefDag: number; gebruiktAccountArbeidTarief: boolean }, accountUurtarief: number): number {
  if (cs.arbeidStapEenheid === "UUR") return cs.gebruiktAccountArbeidTarief ? accountUurtarief : cs.arbeidTariefUur;
  return cs.arbeidStapEenheid === "DAGDEEL" ? cs.arbeidTariefDagdeel : cs.arbeidTariefDag;
}

export type RekenEenheidPlan = { toolId: string; toolNaam: string; plan: GlobaleWissel };

// Wat er verandert als de eenheid van deze rekentool wisselt (zonder iets op te slaan).
export async function planRekenEenheid(db: Db, companyId: string, toolId: string, naar: WerktempoEenheid): Promise<RekenEenheidPlan | null> {
  const [tool, company, uren, producten] = await Promise.all([
    db.tool.findFirst({ where: { id: toolId, companyId }, select: { id: true, naam: true, costSettings: true } }),
    db.company.findUniqueOrThrow({ where: { id: companyId }, select: { standaardArbeidTariefUur: true } }),
    laadUren(db, companyId),
    laadPlanProducten(db, toolId),
  ]);
  if (!tool) return null;
  const cs = tool.costSettings ?? { arbeidStapEenheid: "UUR" as const, arbeidTariefUur: 45, arbeidTariefDagdeel: 180, arbeidTariefDag: 360, gebruiktAccountArbeidTarief: true };
  const van = cs.arbeidStapEenheid;
  const tarief = huidigTarief(cs, company.standaardArbeidTariefUur);
  return { toolId: tool.id, toolNaam: tool.naam, plan: planGlobaleWissel({ producten, van, naar, tarief, uren }) };
}

// Past de wissel van de rekeneenheid van een rekentool toe, binnen de transactie van de aanroeper: de eenheid, het tarief per nieuwe
// eenheid (zelfde prijs per uur), de werktempo's van de producten die de standaard volgen en een eigen tarief per product.
export async function pasRekenEenheidToe(tx: Tx, companyId: string, toolId: string, naar: WerktempoEenheid): Promise<RekenEenheidPlan | null> {
  const p = await planRekenEenheid(tx, companyId, toolId, naar);
  if (!p || p.plan.van === p.plan.naar) return p;
  const { plan } = p;
  const company = await tx.company.findUniqueOrThrow({ where: { id: companyId }, select: { standaardArbeidTariefUur: true } });

  const tariefVeld = plan.naar === "UUR" ? "arbeidTariefUur" : plan.naar === "DAGDEEL" ? "arbeidTariefDagdeel" : "arbeidTariefDag";
  const csData: { arbeidStapEenheid: WerktempoEenheid; gebruiktAccountArbeidTarief?: boolean; [veld: string]: unknown } = { arbeidStapEenheid: plan.naar, [tariefVeld]: plan.nieuwTarief };
  // Rekent de tool in uren met het bedrijfstarief? Dan blijft dat zo zolang het getal gelijk is; anders wordt het een eigen tarief.
  if (plan.naar === "UUR") csData.gebruiktAccountArbeidTarief = Math.abs(plan.nieuwTarief - company.standaardArbeidTariefUur) < 1e-9;
  await tx.costSettings.upsert({ where: { toolId }, create: { toolId, ...(csData as Omit<Prisma.CostSettingsUncheckedCreateInput, "toolId">) }, update: csData as Prisma.CostSettingsUncheckedUpdateInput });

  for (const m of plan.meeveranderend) {
    await tx.product.update({ where: { id: m.id }, data: { productiviteit: m.werktempo, arbeidTariefOverride: m.arbeidTariefOverride } });
    for (const t of m.materiaalTempos) {
      if (t.werktempo !== null) await tx.materialOption.update({ where: { id: t.id }, data: { productiviteitOverride: t.werktempo } });
    }
  }
  for (const b of plan.behouden) {
    if (b.arbeidTariefOverride !== null) await tx.product.update({ where: { id: b.id }, data: { arbeidTariefOverride: b.arbeidTariefOverride } });
  }
  return p;
}

export type UrenPlan = { toolId: string; toolNaam: string; globaal: WerktempoEenheid; aantalProducten: number; wissel: UrenWissel }[];

// Wat er verandert voor de producten van het hele bedrijf als de uren-definities wisselen.
export async function planUren(db: Db, companyId: string, nieuw: UrenConfig): Promise<{ oud: UrenConfig; tools: UrenPlan }> {
  const oud = await laadUren(db, companyId);
  const tools = await db.tool.findMany({ where: { companyId, deletedAt: null }, select: { id: true, naam: true, costSettings: { select: { arbeidStapEenheid: true } } }, orderBy: { order: "asc" } });
  const uit: UrenPlan = [];
  for (const t of tools) {
    const producten = await laadPlanProducten(db, t.id);
    const globaal = t.costSettings?.arbeidStapEenheid ?? "UUR";
    uit.push({ toolId: t.id, toolNaam: t.naam, globaal, aantalProducten: producten.length, wissel: planUrenWissel({ producten, globaal, oud, nieuw }) });
  }
  return { oud, tools: uit };
}

export { convertTarief, schoon };

export type ProductEenheidInvoer = {
  // null = Standaard (de eenheid van de rekentool).
  eenheid: WerktempoEenheid | null;
  // De omgerekende waarden; de dialog heeft ze al getoond. null = geen werktempo.
  werktempo: number | null;
  materiaalTempos: { id: string; werktempo: number | null }[];
};

const EENHEDEN = ["UUR", "DAGDEEL", "DAG"];
const geldigTempo = (w: unknown) => w === null || (typeof w === "number" && Number.isFinite(w) && w > 0 && w <= 1e9);

// Eenheid en geconverteerd werktempo (en dat per materiaal) van één product in één transactie: of alles, of niets.
export async function pasProductEenheidToe(db: typeof prisma, companyId: string, productId: string, invoer: ProductEenheidInvoer): Promise<{ ok: true; toolId: string; toolSlug: string } | { ok: false; error: string }> {
  if (invoer.eenheid !== null && !EENHEDEN.includes(invoer.eenheid)) return { ok: false, error: "Kies uur, dagdeel of dag." };
  if (!geldigTempo(invoer.werktempo) || !invoer.materiaalTempos.every((m) => typeof m.id === "string" && geldigTempo(m.werktempo))) return { ok: false, error: "Het werktempo is geen geldig getal." };
  const product = await db.product.findFirst({
    where: { id: productId, tool: { companyId } },
    select: { id: true, toolId: true, tool: { select: { slug: true } }, materiaalCategorieen: { select: { materialen: { select: { id: true } } } } },
  });
  if (!product) return { ok: false, error: "Onderdeel niet gevonden." };
  const eigen = new Set(product.materiaalCategorieen.flatMap((c) => c.materialen.map((m) => m.id)));
  if (!invoer.materiaalTempos.every((m) => eigen.has(m.id))) return { ok: false, error: "Een materiaal hoort niet bij dit onderdeel." };
  await db.$transaction([
    db.product.update({ where: { id: product.id }, data: { werktempoEenheid: invoer.eenheid, productiviteit: invoer.werktempo } }),
    ...invoer.materiaalTempos.filter((m) => m.werktempo !== null).map((m) => db.materialOption.update({ where: { id: m.id }, data: { productiviteitOverride: m.werktempo } })),
  ]);
  return { ok: true, toolId: product.toolId, toolSlug: product.tool.slug };
}

// De uren-definities van het bedrijf wijzigen, in één transactie. "gelijk": het werktempo van producten met een andere eigen eenheid wordt
// aangepast zodat hun prijs gelijk blijft; "meebewegen": hun werktempo blijft staan en hun prijs volgt de nieuwe definitie.
// Producten in de eenheid van hun rekentool houden in beide gevallen dezelfde prijs.
export async function pasUrenToe(db: typeof prisma, companyId: string, nieuw: UrenConfig, modus: "gelijk" | "meebewegen"): Promise<void> {
  await db.$transaction(async (tx) => {
    if (modus === "gelijk") {
      const { tools } = await planUren(tx, companyId, nieuw);
      for (const t of tools) {
        for (const r of t.wissel.rakend) {
          if (r.nieuwWerktempo !== null) await tx.product.update({ where: { id: r.id }, data: { productiviteit: r.nieuwWerktempo } });
          for (const m of r.nieuweMateriaalTempos) {
            if (m.werktempo !== null) await tx.materialOption.update({ where: { id: m.id }, data: { productiviteitOverride: m.werktempo } });
          }
        }
      }
    }
    await tx.company.update({ where: { id: companyId }, data: nieuw });
  });
}
