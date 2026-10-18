"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany, requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { parseGetal } from "@/app/lib/getal";
import { pasProductEenheidToe, pasUrenToe, pasRekenEenheidToe, planRekenEenheid, planUren, type ProductEenheidInvoer } from "@/app/lib/werktempo-server";
import { valideerUrenConfig, type UrenConfig, type UrenFouten, type WerktempoEenheid } from "@/app/lib/werktempo";

const EENHEDEN = ["UUR", "DAGDEEL", "DAG"] as const;
const isEenheid = (x: unknown): x is WerktempoEenheid => typeof x === "string" && (EENHEDEN as readonly string[]).includes(x);

function ververs(companySlug: string, toolId: string, toolSlug: string) {
  revalidatePath(`/dashboard/tools/${toolId}`, "layout");
  revalidatePath(`/t/${companySlug}/${toolSlug}`);
  revalidatePath(`/portaal/${companySlug}`);
}

// ---- Eén product: eigen eenheid kiezen of terug naar "Standaard" ----------------------------------------------------------

export type { ProductEenheidInvoer };

export async function wijzigProductEenheidAction(productId: string, invoer: ProductEenheidInvoer): Promise<{ ok: true } | { ok: false; error: string }> {
  const { company } = await requireActiveCompany();
  const r = await pasProductEenheidToe(prisma, company.id, productId, invoer);
  if (!r.ok) return r;
  ververs(company.slug, r.toolId, r.toolSlug);
  return { ok: true };
}

// ---- De eenheid van de rekentool (instellingen) ----------------------------------------------------------------------------

export type RekenEenheidSamenvatting = {
  toolId: string;
  toolNaam: string;
  van: WerktempoEenheid;
  naar: WerktempoEenheid;
  nieuwTarief: number;
  aantalMeeveranderend: number;
  aantalBehouden: number;
  // Eerste product met een werktempo, als voorbeeld.
  voorbeeld: { naam: string; van: number; naar: number } | null;
};

function samenvatting(p: NonNullable<Awaited<ReturnType<typeof planRekenEenheid>>>): RekenEenheidSamenvatting {
  const eerste = p.plan.meeveranderend.find((m) => m.werktempo !== null);
  return {
    toolId: p.toolId,
    toolNaam: p.toolNaam,
    van: p.plan.van,
    naar: p.plan.naar,
    nieuwTarief: p.plan.nieuwTarief,
    aantalMeeveranderend: p.plan.meeveranderend.length,
    aantalBehouden: p.plan.behouden.length,
    voorbeeld: eerste ? { naam: eerste.naam, van: 0, naar: eerste.werktempo! } : null,
  };
}

// Voorbeeld-werktempo "van" invullen vanuit de oorspronkelijke waarde.
async function metVoorbeeld(toolId: string, s: RekenEenheidSamenvatting): Promise<RekenEenheidSamenvatting> {
  if (!s.voorbeeld) return s;
  const p = await prisma.product.findFirst({ where: { toolId, naam: s.voorbeeld.naam, productiviteit: { not: null }, werktempoEenheid: null }, select: { productiviteit: true } });
  return { ...s, voorbeeld: { ...s.voorbeeld, van: p?.productiviteit ?? 0 } };
}

// Voor de bevestigingsdialog: wat verandert er als de eenheid van deze rekentool wisselt? Slaat niets op.
export async function previewRekenEenheidAction(toolId: string | "alle", naar: WerktempoEenheid): Promise<{ ok: true; tools: RekenEenheidSamenvatting[] } | { ok: false; error: string }> {
  const { company } = await requireActiveCompany();
  if (!isEenheid(naar)) return { ok: false, error: "Kies uur, dagdeel of dag." };
  const tools = toolId === "alle" ? await prisma.tool.findMany({ where: { companyId: company.id, deletedAt: null }, select: { id: true }, orderBy: { order: "asc" } }) : [{ id: toolId }];
  const uit: RekenEenheidSamenvatting[] = [];
  for (const t of tools) {
    const p = await planRekenEenheid(prisma, company.id, t.id, naar);
    if (!p) return { ok: false, error: "Rekentool niet gevonden." };
    if (p.plan.van !== naar) uit.push(await metVoorbeeld(t.id, samenvatting(p)));
  }
  return { ok: true, tools: uit };
}

// Bevestigd: eenheid, tarief en alle werktempo's van de producten die de standaard volgen in één transactie.
export async function wijzigRekenEenheidAction(toolId: string, naar: WerktempoEenheid): Promise<{ ok: true } | { ok: false; error: string }> {
  const { company, tool } = await requireActiveTool(toolId);
  if (!isEenheid(naar)) return { ok: false, error: "Kies uur, dagdeel of dag." };
  await prisma.$transaction((tx) => pasRekenEenheidToe(tx, company.id, toolId, naar));
  ververs(company.slug, toolId, tool.slug);
  revalidatePath(`/dashboard/tools/${toolId}/prijzen`);
  revalidatePath("/dashboard/profiel", "layout");
  return { ok: true };
}

// ---- Wat een dagdeel en een dag in uren zijn (per hovenier) ----------------------------------------------------------------

export type UrenSamenvatting = {
  oud: UrenConfig;
  nieuw: UrenConfig;
  // Producten met een eigen eenheid die afwijkt van die van hun rekentool: bij hen hangt de prijs van de definities af.
  rakend: { toolNaam: string; naam: string; eenheid: WerktempoEenheid; werktempo: number | null; nieuwWerktempo: number | null }[];
  aantalProducten: number;
};

export async function previewUrenAction(invoer: { urenPerDagdeel: string; urenPerDag: string }): Promise<{ ok: true; samenvatting: UrenSamenvatting } | { ok: false; fouten: UrenFouten }> {
  const { company } = await requireActiveCompany();
  const geparsed = parseUren(invoer);
  if (!geparsed.ok) return geparsed;
  const { oud, tools } = await planUren(prisma, company.id, geparsed.config);
  return {
    ok: true,
    samenvatting: {
      oud,
      nieuw: geparsed.config,
      aantalProducten: tools.reduce((s, t) => s + t.aantalProducten, 0),
      rakend: tools.flatMap((t) => t.wissel.rakend.map((r) => ({ toolNaam: t.toolNaam, naam: r.naam, eenheid: r.eenheid, werktempo: r.werktempo, nieuwWerktempo: r.nieuwWerktempo }))),
    },
  };
}

function parseUren(invoer: { urenPerDagdeel: string; urenPerDag: string }): { ok: true; config: UrenConfig } | { ok: false; fouten: UrenFouten } {
  const n = (t: string) => {
    const r = parseGetal(t, { soort: "getal" });
    return r.ok ? r.waarde : NaN;
  };
  return valideerUrenConfig({ urenPerDagdeel: n(invoer.urenPerDagdeel), urenPerDag: n(invoer.urenPerDag) });
}

// modus "gelijk": het werktempo van producten met een andere eigen eenheid wordt aangepast zodat hun prijs gelijk blijft;
// "meebewegen": hun werktempo blijft staan en hun prijs verandert mee met de nieuwe definitie.
export async function wijzigUrenAction(invoer: { urenPerDagdeel: string; urenPerDag: string; modus: "gelijk" | "meebewegen" }): Promise<{ ok: true } | { ok: false; error?: string; fouten?: UrenFouten }> {
  const { company } = await requireActiveCompany();
  const geparsed = parseUren(invoer);
  if (!geparsed.ok) return { ok: false, fouten: geparsed.fouten };
  const nieuw = geparsed.config;

  await pasUrenToe(prisma, company.id, nieuw, invoer.modus);
  const tools = await prisma.tool.findMany({ where: { companyId: company.id, deletedAt: null }, select: { id: true, slug: true } });
  for (const t of tools) ververs(company.slug, t.id, t.slug);
  revalidatePath("/dashboard/profiel", "layout");
  return { ok: true };
}

// Alle rekentools van het bedrijf wisselen van rekeneenheid ("Tarieven" in het profiel): per rekentool dezelfde omrekening, samen in één transactie.
export async function wijzigBedrijfRekenEenheidAction(naar: WerktempoEenheid): Promise<{ ok: true } | { ok: false; error: string }> {
  const { company } = await requireActiveCompany();
  if (!isEenheid(naar)) return { ok: false, error: "Kies uur, dagdeel of dag." };
  const tools = await prisma.tool.findMany({ where: { companyId: company.id, deletedAt: null }, select: { id: true, slug: true } });
  await prisma.$transaction(async (tx) => {
    for (const t of tools) await pasRekenEenheidToe(tx, company.id, t.id, naar);
  });
  for (const t of tools) ververs(company.slug, t.id, t.slug);
  revalidatePath("/dashboard/profiel", "layout");
  return { ok: true };
}
