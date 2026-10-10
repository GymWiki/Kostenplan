import { describe, expect, it } from "vitest";
import { draftSchema, MAX_ONDERDELEN, schoonTekst } from "./draft";
import { logoUitDataUrl, MAX_LOGO_BYTES } from "./draft-logo";
import { testDraft } from "./draft.test-helpers";

const klonen = () => JSON.parse(JSON.stringify(testDraft()));

describe("draftSchema (server vertrouwt de browser niet)", () => {
  it("accepteert een geldige draft", () => {
    expect(draftSchema.safeParse(klonen()).success).toBe(true);
  });

  it("weigert te veel onderdelen", () => {
    const d = klonen();
    const w = d.calculator.werkzaamheden[0];
    d.calculator.werkzaamheden = Array.from({ length: MAX_ONDERDELEN + 1 }, (_, i) => ({ ...w, id: `w${i}` }));
    expect(draftSchema.safeParse(d).success).toBe(false);
  });

  it("haalt HTML uit namen", () => {
    const d = klonen();
    d.company.name = "<img src=x onerror=alert(1)>Tuinen <b>De Vries</b>";
    d.calculator.werkzaamheden[0].draft.naam = "<script>alert(1)</script>Schutting";
    const r = draftSchema.parse(d);
    expect(r.company.name).toBe("Tuinen De Vries");
    expect(r.calculator.werkzaamheden[0].draft.naam).toBe("alert(1)Schutting");
    expect(JSON.stringify(r)).not.toMatch(/[<>]/);
  });

  it("weigert enorme of onzinnige getallen", () => {
    for (const waarde of ["99999999999", "abc", "1e9", "-5"]) {
      const d = klonen();
      d.calculator.werkzaamheden[0].draft.materialen[0].prijs = waarde;
      expect(draftSchema.safeParse(d).success, waarde).toBe(false);
    }
    const d = klonen();
    d.tarieven.tarief = 1e12;
    expect(draftSchema.safeParse(d).success).toBe(false);
  });

  it("weigert een andere versie, een ongeldige kleur en een te groot logo", () => {
    expect(draftSchema.safeParse({ ...klonen(), version: 2 }).success).toBe(false);
    const k = klonen();
    k.company.colors.primair = "red";
    expect(draftSchema.safeParse(k).success).toBe(false);
    const l = klonen();
    l.company.logoDataUrl = "data:image/png;base64," + "A".repeat(400_000);
    expect(draftSchema.safeParse(l).success).toBe(false);
  });

  it("schoonTekst verwijdert stuurtekens", () => {
    expect(schoonTekst("a\u0000b\n c")).toBe("ab c");
  });
});

describe("logoUitDataUrl", () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40)]);
  const url = (mime: string, b: Buffer) => `data:${mime};base64,${b.toString("base64")}`;

  it("accepteert echte png en jpg", () => {
    expect(logoUitDataUrl(url("image/png", png))?.ext).toBe("png");
    expect(logoUitDataUrl(url("image/jpeg", jpg))?.ext).toBe("jpg");
  });
  it("weigert andere bestandstypen en nep-extensies", () => {
    expect(logoUitDataUrl(url("image/gif", Buffer.from("GIF89a")))).toBeNull();
    expect(logoUitDataUrl(url("image/svg+xml", Buffer.from("<svg onload=alert(1)>")))).toBeNull();
    expect(logoUitDataUrl(url("image/png", jpg))).toBeNull(); // zegt png, is jpg
    expect(logoUitDataUrl(url("image/png", Buffer.from("<html>")))).toBeNull();
    expect(logoUitDataUrl("https://evil.example/x.png")).toBeNull();
  });
  it("weigert een logo boven 200 KB", () => {
    expect(logoUitDataUrl(url("image/png", Buffer.concat([png, Buffer.alloc(MAX_LOGO_BYTES)])))).toBeNull();
  });
});
