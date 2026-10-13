import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/lib/analytics-opslag", () => ({ recordAnalyticsEvent: vi.fn(async () => {}) }));

const leads = new Map<string, { id: string }>();
const aangemaakt = vi.fn();
const prismaMock = {
  lead: {
    findUnique: vi.fn(async ({ where }: { where: { idempotentieSleutel: string } }) => leads.get(where.idempotentieSleutel) ?? null),
    create: vi.fn(async ({ data }: { data: { idempotentieSleutel: string | null } }) => {
      aangemaakt(data);
      const lead = { id: `lead-${leads.size + 1}` };
      if (data.idempotentieSleutel) leads.set(data.idempotentieSleutel, lead);
      return lead;
    }),
  },
  tool: {
    findFirst: vi.fn(async () => ({
      id: "t1",
      naam: "Tuin",
      companyId: "c1",
      activeCalculatorConfigId: null,
      company: { subscriptionTier: "PLUS", overrideTier: null },
    })),
  },
};
vi.mock("@/app/lib/prisma", () => ({ prisma: prismaMock, prismaBasis: prismaMock }));

const { maakLead } = await import("./lead-aanmaken");

const snapshot = {
  regels: [{ naam: "Terras", type: "dienst" }],
  arbeidskosten: 1, materiaalkosten: 2, transportkosten: 0, voorrijkosten: 0, subtotaal: 3, btw: 0.63, totaal: 3.63,
};
const basis = { toolId: "t1", naam: "Piet", email: "piet@example.nl", telefoonnummer: "", snapshot };

beforeEach(() => {
  leads.clear();
  aangemaakt.mockClear();
});

describe("maakLead", () => {
  it("maakt één lead aan, ook als dezelfde aanvraag twee keer binnenkomt", async () => {
    const sleutel = "abcdefghijklmnop1234";
    const eerste = await maakLead({ ...basis, sleutel });
    const tweede = await maakLead({ ...basis, sleutel });
    expect(eerste).toMatchObject({ ok: true, dubbel: false });
    expect(tweede).toMatchObject({ ok: true, dubbel: true });
    expect(aangemaakt).toHaveBeenCalledTimes(1);
  });

  it("wijst een ongeldig e-mailadres definitief af met een veldfout", async () => {
    const r = await maakLead({ ...basis, email: "geen-mail" });
    expect(r).toMatchObject({ ok: false, permanent: true });
    expect(r.ok === false && r.fieldErrors?.email).toBeTruthy();
  });

  it("wijst een ongeldige sleutel af", async () => {
    const r = await maakLead({ ...basis, sleutel: "x" });
    expect(r).toMatchObject({ ok: false, permanent: true });
  });

  it("wijst een Gratis-bedrijf af", async () => {
    prismaMock.tool.findFirst.mockResolvedValueOnce({
      id: "t1", naam: "Tuin", companyId: "c1", activeCalculatorConfigId: null,
      company: { subscriptionTier: "GRATIS", overrideTier: null },
    });
    expect(await maakLead(basis)).toMatchObject({ ok: false, permanent: true });
  });

  it("gooit bij een databasefout, zodat de aanroeper 'later opnieuw' kan melden", async () => {
    prismaMock.tool.findFirst.mockRejectedValueOnce(new Error("db weg"));
    await expect(maakLead(basis)).rejects.toThrow("db weg");
  });
});
