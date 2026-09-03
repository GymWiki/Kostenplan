import { describe, it, expect, vi } from "vitest";

// `@/app/lib/dal` begint met `import "server-only"`, dat buiten Next's eigen
// bundelaar altijd gooit (zie node_modules/server-only/index.js) — en
// `@/app/lib/prisma` opent bij het laden al een echte Postgres-adapter. Beide
// module-graphs bewust volledig vervangen, zodat deze test puur de
// actie-logica van products.ts toetst, geen echte DB/auth nodig heeft.
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/lib/dal", () => ({
  requireActiveCompany: vi.fn(async () => ({
    company: { id: "company-1", slug: "test-bedrijf" },
  })),
}));
vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: vi.fn(async () => ({ id: "product-1" })),
      update: vi.fn(async () => ({})),
    },
  },
}));

const { redirect } = await import("next/navigation");
const { revalidatePath } = await import("next/cache");
const { updateProductDraftAction } = await import("./products");

// Regressietests voor twee bugs in het autosave-pad van het product-
// bewerkscherm (geen submit-knop, elke wijziging slaat via scheduleAutosave
// in product-form.tsx op): (1) de actie mag nooit doorsturen — de gebruiker
// verlaat de pagina alleen via de expliciete "Terug naar producten"-link, en
// (2) de actie mag nooit revalidatePath aanroepen — dat laat Next.js de
// aanroepende pagina server-side opnieuw renderen, wat bij een doorlopende
// autosave als een skeleton/loading-flits zichtbaar wordt na elke wijziging.
function geldigProductFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const velden: Record<string, string> = {
    naam: "Vloertegels",
    omschrijving: "",
    eenheid: "m2",
    sjabloon: "ENKELE_HOEVEELHEID",
    sjabloonConfig: "{}",
    productiviteit: "",
    arbeidTariefOverride: "",
    transportkostenOverride: "",
    voorrijkostenOverride: "",
    icoon: "",
    ...overrides,
  };
  for (const [key, value] of Object.entries(velden)) formData.set(key, value);
  return formData;
}

describe("updateProductDraftAction (autosave-pad van het product-bewerkscherm)", () => {
  it("stuurt niet door na het opslaan van de naam", async () => {
    const result = await updateProductDraftAction(
      "product-1",
      null,
      geldigProductFormData({ naam: "Nieuwe naam" })
    );

    expect(redirect).not.toHaveBeenCalled();
    // Regressie voor de skeleton-flits-bug: revalidatePath laat Next.js de
    // aanroepende pagina server-side opnieuw renderen (zie
    // node_modules/next/dist/docs/01-app/02-guides/server-actions.md), wat
    // bij een doorlopende autosave als een loading-flits zichtbaar wordt.
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("stuurt niet door na het opslaan van de omschrijving", async () => {
    const result = await updateProductDraftAction(
      "product-1",
      null,
      geldigProductFormData({ omschrijving: "Nieuwe omschrijving" })
    );

    expect(redirect).not.toHaveBeenCalled();
    // Regressie voor de skeleton-flits-bug: revalidatePath laat Next.js de
    // aanroepende pagina server-side opnieuw renderen (zie
    // node_modules/next/dist/docs/01-app/02-guides/server-actions.md), wat
    // bij een doorlopende autosave als een loading-flits zichtbaar wordt.
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
