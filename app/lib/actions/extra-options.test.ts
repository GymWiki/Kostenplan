import { describe, it, expect, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/lib/dal", () => ({
  requireActiveCompany: vi.fn(async () => ({ company: { id: "company-1" } })),
}));
// extra-options.ts importeert @/app/lib/storage (foto-upload), dat met
// `import "server-only"` opent — buiten Next's eigen bundelaar gooit dat
// altijd (zie node_modules/server-only/index.js).
vi.mock("@/app/lib/storage", () => ({
  uploadFoto: vi.fn(),
  deleteFoto: vi.fn(),
  isUploadedFile: vi.fn(() => false),
}));
vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    extraOption: {
      findFirst: vi.fn(async () => ({ id: "option-1" })),
      update: vi.fn(async () => ({})),
    },
  },
}));

const { revalidatePath } = await import("next/cache");
const { toggleExtraOptionActiveAction } = await import("./extra-options");

// Regressietest: ActiveMiniToggle (extra-options-manager.tsx) schakelt dit
// inline om, zonder submit-knop, terwijl het product-bewerkscherm openblijft.
// revalidatePath zou daar de skeleton laten opflitsen (zelfde patroon als
// updateProductDraftAction in products.test.ts).
describe("toggleExtraOptionActiveAction (inline actief/inactief-toggle)", () => {
  it("roept nooit revalidatePath aan", async () => {
    const formData = new FormData();
    formData.set("extraOptionId", "option-1");
    formData.set("actief", "true");

    await toggleExtraOptionActiveAction(formData);

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
