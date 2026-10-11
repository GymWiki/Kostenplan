import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const lead = {
  id: "l1", naam: "Piet <b>", email: "piet@example.nl", telefoonnummer: null, toolNaamSnapshot: "Tuin",
  snapshot: { regels: [{ naam: "Terras", aantal: 20, eenheid: "m²" }] }, totaalIndicatie: 100,
  mailVerzondOp: null, mailPogingen: 0, company: { naam: "Groen", creator: { email: "baas@groen.nl" } },
};
const update = vi.fn(async () => ({}));
vi.mock("@/app/lib/prisma", () => ({
  prismaBasis: { lead: { findUnique: vi.fn(async () => lead), update, findMany: vi.fn(async () => [{ id: "l1" }]) } },
}));

const { bouwLeadMail, volgendePogingNa, verstuurLeadMail } = await import("./lead-mail");

afterEach(() => {
  delete process.env.BREVO_API_KEY;
  vi.unstubAllGlobals();
  update.mockClear();
});

describe("lead-mail", () => {
  it("escapet invoer in de HTML en toont de regels", () => {
    const m = bouwLeadMail(lead);
    expect(m.html).toContain("Piet &lt;b&gt;");
    expect(m.tekst).toContain("Terras – 20 m²");
  });

  it("wacht steeds langer, maximaal 6 uur", () => {
    const nu = new Date("2026-01-01T00:00:00Z");
    expect(volgendePogingNa(1, nu).getTime() - nu.getTime()).toBe(2 * 60_000);
    expect(volgendePogingNa(3, nu).getTime() - nu.getTime()).toBe(8 * 60_000);
    expect(volgendePogingNa(20, nu).getTime() - nu.getTime()).toBe(360 * 60_000);
  });

  it("slaat over zonder BREVO_API_KEY", async () => {
    expect(await verstuurLeadMail("l1")).toBe("overgeslagen");
    expect(update).not.toHaveBeenCalled();
  });

  it("legt een mislukte verzending vast voor een nieuwe poging", async () => {
    process.env.BREVO_API_KEY = "k";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nee", { status: 500 })));
    expect(await verstuurLeadMail("l1")).toBe("later");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ mailPogingen: 1 }) }));
  });

  it("markeert de mail als verzonden als Brevo akkoord geeft", async () => {
    process.env.BREVO_API_KEY = "k";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 201 })));
    expect(await verstuurLeadMail("l1")).toBe("verzonden");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ mailFout: null }) }));
  });
});
