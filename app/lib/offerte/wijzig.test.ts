import { describe, expect, it } from "vitest";
import { dupliceerRegel, dupliceerSectie, nieuweRegel, verplaatsRegel, verplaatsRegelNaarSectie, verplaatsSectie, verwijderRegel, voegRegelToe, voegSectieToe, zetKlantType } from "./wijzig";
import { parseOfferteInhoud } from "./schema";
import { voorbeeldParticulier } from "./voorbeelden";

describe("offerte bewerken", () => {
  const basis = voorbeeldParticulier();
  const sec = basis.secties[0];
  it("regel toevoegen, dupliceren, verplaatsen en verwijderen", () => {
    const r = nieuweRegel("arbeid", null, { omschrijving: "Extra" });
    expect(r.btw).toBe(21);
    let i = voegRegelToe(basis, sec.id, r);
    expect(i.secties[0].regels.at(-1)!.omschrijving).toBe("Extra");
    const d = dupliceerRegel(i, sec.id, r.id);
    expect(d.inhoud.secties[0].regels).toHaveLength(sec.regels.length + 2);
    expect(d.nieuweId).not.toBe(r.id);
    i = verplaatsRegel(d.inhoud, sec.id, r.id, -1);
    expect(i.secties[0].regels.findIndex((x) => x.id === r.id)).toBe(sec.regels.length - 1);
    i = verwijderRegel(i, sec.id, r.id);
    expect(i.secties[0].regels).toHaveLength(sec.regels.length + 1);
  });
  it("planten krijgen standaard 9%, met eigen instelling 21%", () => {
    expect(nieuweRegel("planten").btw).toBe(9);
    expect(nieuweRegel("planten", { planten: 21 }).btw).toBe(21);
  });
  it("secties toevoegen, dupliceren en verplaatsen; regel naar andere sectie", () => {
    const { inhoud, id } = voegSectieToe(basis);
    expect(inhoud.secties.at(-1)!.id).toBe(id);
    const d = dupliceerSectie(inhoud, sec.id);
    expect(d.inhoud.secties[1].titel).toMatch(/kopie/);
    expect(d.inhoud.secties[1].regels[0].id).not.toBe(sec.regels[0].id);
    expect(verplaatsSectie(basis, basis.secties[1].id, -1).secties[0].id).toBe(basis.secties[1].id);
    const naar = verplaatsRegelNaarSectie(basis, sec.regels[0].id, basis.secties[1].id);
    expect(naar.secties[0].regels).toHaveLength(sec.regels.length - 1);
    expect(naar.secties[1].regels.at(-1)!.id).toBe(sec.regels[0].id);
  });
  it("herroepingsrecht staat standaard aan voor particulieren", () => {
    expect(zetKlantType(basis, "zakelijk").herroeping.aan).toBe(false);
    expect(zetKlantType(zetKlantType(basis, "zakelijk"), "particulier").herroeping.aan).toBe(true);
  });
  it("schema accepteert een geldige offerte en weigert rare waarden", () => {
    expect(parseOfferteInhoud(JSON.parse(JSON.stringify(basis))).ok).toBe(true);
    const slecht = JSON.parse(JSON.stringify(basis));
    slecht.secties[0].regels[0].btw = 13;
    expect(parseOfferteInhoud(slecht).ok).toBe(false);
    const nan = JSON.parse(JSON.stringify(basis));
    nan.secties[0].regels[0].prijsCenten = 1.5;
    expect(parseOfferteInhoud(nan).ok).toBe(false);
  });
});
