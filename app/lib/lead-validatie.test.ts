import { describe, expect, it } from "vitest";
import { leadContactSchema, leadSnapshotSchema } from "./validation";
import { valideerLead } from "./lead-validatie";

const snapshot = { regels: [{ naam: "Terras", type: "dienst" }], arbeidskosten: 1, materiaalkosten: 2, transportkosten: 0, voorrijkosten: 0, subtotaal: 3, btw: 0.6, totaal: 3.6 };
const basis = { toolId: "t1", naam: "Piet", email: "piet@example.nl", telefoonnummer: "", snapshot, sleutel: "abcdefghijklmnop1234" };

// De reserve mag nooit iets accepteren wat de app afwijst (dan komt de lead
// bij het opnemen niet door). Omgekeerd (strenger) is toegestaan.
describe("valideerLead is niet soepeler dan de app-validatie", () => {
  const gevallen: Record<string, Partial<typeof basis> & { email?: string; naam?: string }> = {
    geldig: {},
    "lege naam": { naam: "  " },
    "te lange naam": { naam: "x".repeat(121) },
    "geen @": { email: "piet.example.nl" },
    "geen punt": { email: "piet@example" },
    "spatie": { email: "pi et@example.nl" },
    "lang telefoonnummer": { telefoonnummer: "1".repeat(31) },
    "lege regels": { snapshot: { ...snapshot, regels: [] } },
    "geen totaal": { snapshot: { ...snapshot, totaal: undefined } as unknown as typeof snapshot },
  };
  for (const [naam, wijziging] of Object.entries(gevallen)) {
    it(naam, () => {
      const invoer = { ...basis, ...wijziging };
      const app =
        leadContactSchema.safeParse({ naam: invoer.naam, email: invoer.email, telefoonnummer: invoer.telefoonnummer }).success &&
        leadSnapshotSchema.safeParse(invoer.snapshot).success;
      const reserve = valideerLead(invoer).ok;
      if (!app) expect(reserve).toBe(false);
      if (naam === "geldig") expect(reserve).toBe(true);
    });
  }

  it("weigert een ontbrekende of ongeldige sleutel", () => {
    expect(valideerLead({ ...basis, sleutel: "kort" }).ok).toBe(false);
    expect(valideerLead({ ...basis, sleutel: undefined }).ok).toBe(false);
  });
});
