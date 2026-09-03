import { describe, it, expect, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/lib/dal", () => ({
  requireDraftCalculatorConfig: vi.fn(async () => ({ draft: { id: "draft-1" } })),
  requireActiveTool: vi.fn(),
}));
vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    calculatorConfig: {
      update: vi.fn(async () => ({})),
    },
  },
}));

const { revalidatePath } = await import("next/cache");
const { legeModulaireCalculatorConfig } = await import("@/app/lib/calculator-engine");
const { saveCalculatorConfigDraftAction } = await import("./calculator-config");

// Regressietest: de Bouwer-builder (onderdelen-bouwer.tsx/calculator-
// bouwer.tsx) roept dit bij elke wijziging aan, zonder submit-knop, terwijl
// de bouwer-pagina openblijft. revalidatePath zou daar de skeleton laten
// opflitsen (zelfde patroon als updateProductDraftAction in
// products.test.ts) — de DRAFT is bovendien nooit publiek zichtbaar, dus er
// is niets dat hier direct gerevalideerd hoeft te worden.
describe("saveCalculatorConfigDraftAction (autosave-pad van de Bouwer)", () => {
  it("roept nooit revalidatePath aan", async () => {
    await saveCalculatorConfigDraftAction("tool-1", legeModulaireCalculatorConfig());

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
