"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveCompany, requireActiveTool } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { productSchema } from "@/app/lib/validation";
import { effectiveTier, PLAN_LIMITS } from "@/app/lib/subscription";
import type { Prisma } from "@/app/generated/prisma/client";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    naam: formData.get("naam"),
    omschrijving: formData.get("omschrijving") ?? "",
    eenheid: formData.get("eenheid"),
    sjabloon: formData.get("sjabloon") ?? "ENKELE_HOEVEELHEID",
    sjabloonConfig: formData.get("sjabloonConfig") ?? "{}",
    productiviteit: formData.get("productiviteit"),
    arbeidTariefOverride: formData.get("arbeidTariefOverride"),
    transportkostenOverride: formData.get("transportkostenOverride"),
    transportMeeschalend: formData.get("transportMeeschalend") === "on",
    voorrijkostenOverride: formData.get("voorrijkostenOverride"),
    voorrijMeeschalend: formData.get("voorrijMeeschalend") === "on",
    icoon: formData.get("icoon") ?? "",
    actief: formData.get("actief") === "on",
  });
}

type ActiveCompany = Awaited<ReturnType<typeof requireActiveCompany>>["company"];

function revalidateToolPaths(toolId: string, companySlug: string, toolSlug: string) {
  revalidatePath(`/dashboard/tools/${toolId}/producten`);
  revalidatePath(`/t/${companySlug}/${toolSlug}`);
  revalidatePath(`/portaal/${companySlug}`);
}

// Boven deze grens kan een Gratis-tenant geen nieuw product meer aanmaken —
// telt (sinds Levering A) bewust over alle tools van het bedrijf heen, niet
// per tool, zie PLAN_LIMITS.maxProductsPerCompany in app/lib/subscription.ts.
async function magNieuwProduct(company: ActiveCompany) {
  const limiet = PLAN_LIMITS[effectiveTier(company)].maxProductsPerCompany;
  if (limiet === null) return true;
  const count = await prisma.product.count({ where: { tool: { companyId: company.id } } });
  return count < limiet;
}

type CreateProductResult =
  | { success: true; productId: string; materiaalOptieId: string }
  | { success: false; state: ProductFormState };

// Gedeelde kernlogica van "nieuw product aanmaken" — los van of de aanroeper
// daarna doorstuurt (createProductAction, het gewone formulier) of in dezelfde
// pagina blijft om verder te gaan met een volgende wizardstap
// (createProductDraftAction, zie nieuw/product-wizard.tsx).
async function createProduct(
  company: ActiveCompany,
  toolId: string,
  formData: FormData
): Promise<CreateProductResult> {
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { success: false, state: { fieldErrors } };
  }

  if (!(await magNieuwProduct(company))) {
    return {
      success: false,
      state: {
        error: `Je hebt de limiet van ${PLAN_LIMITS.GRATIS.maxProductsPerCompany} producten (over al je rekentools heen) voor het Gratis-pakket bereikt. Upgrade naar Plus of Pro voor onbeperkt producten.`,
      },
    };
  }

  const count = await prisma.product.count({ where: { toolId } });

  // Elk product krijgt meteen een standaard-materiaalcategorie met één optie
  // — blok 1 (materiaalkosten) heeft altijd iets om een prijs aan te hangen,
  // zowel in de wizard als het bewerkscherm. De vakman kan 'm hernoemen of
  // uitbreiden bij Materialen.
  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      sjabloonConfig: parsed.data.sjabloonConfig as Prisma.InputJsonValue,
      toolId,
      order: count,
      materiaalCategorieen: {
        create: [
          {
            naam: "Materiaal",
            verplicht: true,
            order: 0,
            materialen: { create: [{ naam: "Standaard", prijs: 0, order: 0 }] },
          },
        ],
      },
    },
    include: { materiaalCategorieen: { include: { materialen: true } } },
  });

  return { success: true, productId: product.id, materiaalOptieId: product.materiaalCategorieen[0].materialen[0].id };
}

export async function createProductAction(
  toolId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const { company, tool } = await requireActiveTool(toolId);
  const result = await createProduct(company, toolId, formData);
  if (!result.success) return result.state;
  revalidateToolPaths(toolId, company.slug, tool.slug);
  redirect(`/dashboard/tools/${toolId}/producten/${result.productId}/bewerken`);
}

// Voor de wizard (nieuw/product-wizard.tsx): maakt het product aan zonder
// door te sturen, zodat de wizard op dezelfde pagina met stap 2 verder kan —
// "elke wizardstap slaat direct op als concept" uit de opdracht.
export type CreateProductDraftState =
  | { error?: string; fieldErrors?: Record<string, string>; productId?: string; materiaalOptieId?: string }
  | null;

export async function createProductDraftAction(
  toolId: string,
  _prevState: CreateProductDraftState,
  formData: FormData
): Promise<CreateProductDraftState> {
  const { company, tool } = await requireActiveTool(toolId);
  const result = await createProduct(company, toolId, formData);
  if (!result.success) return result.state;
  revalidateToolPaths(toolId, company.slug, tool.slug);
  return { productId: result.productId, materiaalOptieId: result.materiaalOptieId };
}

type SaveProductResult = { success: true } | { success: false; state: ProductFormState };

async function saveProduct(
  productId: string,
  companyId: string,
  formData: FormData
): Promise<SaveProductResult> {
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { success: false, state: { fieldErrors } };
  }

  const existing = await prisma.product.findFirst({
    where: { id: productId, tool: { companyId } },
    select: { id: true },
  });
  if (!existing) return { success: false, state: { error: "Product niet gevonden." } };

  await prisma.product.update({
    where: { id: productId },
    data: {
      ...parsed.data,
      sjabloonConfig: parsed.data.sjabloonConfig as Prisma.InputJsonValue,
    },
  });

  return { success: true };
}

// Het bewerkscherm heeft geen submit-knop — elke wijziging slaat via
// autosave op (zie scheduleAutosave in product-form.tsx), dus deze actie
// stuurt bewust nooit door. De wizard gebruikt 'm ook, en beslist zelf
// wanneer naar de volgende stap of naar het volledige bewerkscherm gegaan
// wordt.
//
// Bewust GEEN revalidatePath hier: een Server Action die revalidatePath/
// revalidateTag/refresh() aanroept, laat Next.js de aanroepende route
// server-side opnieuw renderen en dat antwoord (inclusief een nieuwe RSC
// payload) samen met de actie terugsturen — bij een doorlopende autosave-flow
// zorgt dat voor de skeleton/loading-flits na elke wijziging (zie
// node_modules/next/dist/docs/01-app/02-guides/server-actions.md). Het
// bewerkscherm zelf toont de laatst getypte waarde al via zijn eigen
// React-state; geen enkele pagina in deze app gebruikt "use cache", dus er is
// ook geen server-cache om hier stil te laten verlopen (bewerkscherm-content
// wordt sowieso altijd vers gerenderd bij het volgende bezoek).
export async function updateProductDraftAction(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const { company } = await requireActiveCompany();
  const result = await saveProduct(productId, company.id, formData);
  if (!result.success) return result.state;

  return null;
}

export async function deleteProductAction(formData: FormData) {
  const { company } = await requireActiveCompany();
  const productId = formData.get("productId");
  if (typeof productId !== "string") return;

  const product = await prisma.product.findFirst({
    where: { id: productId, tool: { companyId: company.id } },
    select: { toolId: true, tool: { select: { slug: true } } },
  });
  if (!product) return;

  await prisma.product.delete({ where: { id: productId } });

  revalidateToolPaths(product.toolId, company.slug, product.tool.slug);
}

// "Kopieer bestaand product" (zie producten-lijst): slaat de wizard over en
// stuurt direct door naar het bewerkscherm van de kopie — alle instellingen
// (sjabloon, kostenopbouw, materiaalcategorieën, extra opties) komen mee,
// alleen actief staat uit zodat de kopie niet ongemerkt live gaat voor de
// klant terwijl de vakman 'm nog aan het aanpassen is. Kopieert altijd
// binnen dezelfde tool — een product tussen tools kopiëren is een bewuste
// keuze voor de gedeelde-productbibliotheek uit Levering B, niet hier.
export async function copyProductAction(formData: FormData) {
  const { company } = await requireActiveCompany();
  const productId = formData.get("productId");
  if (typeof productId !== "string") return;

  const origineel = await prisma.product.findFirst({
    where: { id: productId, tool: { companyId: company.id } },
    include: {
      materiaalCategorieen: { include: { materialen: true } },
      extraOpties: true,
      tool: { select: { slug: true } },
    },
  });
  if (!origineel) return;

  if (!(await magNieuwProduct(company))) return;

  const count = await prisma.product.count({ where: { toolId: origineel.toolId } });

  const kopie = await prisma.product.create({
    data: {
      toolId: origineel.toolId,
      naam: `${origineel.naam} (kopie)`,
      omschrijving: origineel.omschrijving,
      eenheid: origineel.eenheid,
      sjabloon: origineel.sjabloon,
      sjabloonConfig: origineel.sjabloonConfig as Prisma.InputJsonValue,
      productiviteit: origineel.productiviteit,
      arbeidTariefOverride: origineel.arbeidTariefOverride,
      transportkostenOverride: origineel.transportkostenOverride,
      transportMeeschalend: origineel.transportMeeschalend,
      voorrijkostenOverride: origineel.voorrijkostenOverride,
      voorrijMeeschalend: origineel.voorrijMeeschalend,
      icoon: origineel.icoon,
      actief: false,
      order: count,
      materiaalCategorieen: {
        create: origineel.materiaalCategorieen.map((categorie) => ({
          naam: categorie.naam,
          verplicht: categorie.verplicht,
          order: categorie.order,
          materialen: {
            create: categorie.materialen.map((materiaal) => ({
              naam: materiaal.naam,
              prijs: materiaal.prijs,
              prijsType: materiaal.prijsType,
              prijsMin: materiaal.prijsMin,
              prijsMax: materiaal.prijsMax,
              stapgrootte: materiaal.stapgrootte,
              productiviteitOverride: materiaal.productiviteitOverride,
              foto: materiaal.foto,
              actief: materiaal.actief,
              order: materiaal.order,
            })),
          },
        })),
      },
      extraOpties: {
        create: origineel.extraOpties.map((extra) => ({
          naam: extra.naam,
          omschrijving: extra.omschrijving,
          prijs: extra.prijs,
          type: extra.type,
          foto: extra.foto,
          actief: extra.actief,
          order: extra.order,
        })),
      },
    },
  });

  revalidatePath(`/dashboard/tools/${origineel.toolId}/producten`);
  redirect(`/dashboard/tools/${origineel.toolId}/producten/${kopie.id}/bewerken`);
}

export async function toggleProductActiveAction(formData: FormData) {
  const { company } = await requireActiveCompany();
  const productId = formData.get("productId");
  const actief = formData.get("actief") === "true";
  if (typeof productId !== "string") return;

  const product = await prisma.product.findFirst({
    where: { id: productId, tool: { companyId: company.id } },
    select: { toolId: true, tool: { select: { slug: true } } },
  });
  if (!product) return;

  await prisma.product.updateMany({
    where: { id: productId },
    data: { actief: !actief },
  });

  revalidateToolPaths(product.toolId, company.slug, product.tool.slug);
}
