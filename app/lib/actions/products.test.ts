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
      findUniqueOrThrow: vi.fn(async () => ({
        toolId: "tool-1",
        tool: { slug: "test-tool" },
      })),
    },
  },
}));

const { redirect } = await import("next/navigation");
const { updateProductDraftAction } = await import("./products");

// Regressietest voor de "autosave springt terug naar het productenoverzicht"-
// bug: het product-bewerkscherm heeft geen submit-knop, elke wijziging slaat
// via autosave op (zie scheduleAutosave in product-form.tsx), en die actie
// mag daarom NOOIT doorsturen — de gebruiker verlaat de pagina alleen via de
// expliciete "Terug naar producten"-link.
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
    expect(result).toBeNull();
  });

  it("stuurt niet door na het opslaan van de omschrijving", async () => {
    const result = await updateProductDraftAction(
      "product-1",
      null,
      geldigProductFormData({ omschrijving: "Nieuwe omschrijving" })
    );

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
