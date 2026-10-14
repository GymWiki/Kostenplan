import { describe, expect, it } from "vitest";
import { DEFAULT_EMBED_CONFIG } from "@/app/lib/tools";
import { bouwEmbedCode, bouwIframeCode } from "./embed-code";

const opties = {
  toolId: "tool123",
  toolNaam: "Tuinaanleg",
  baseUrl: "https://app.test",
  reserveUrl: "https://reserve.test",
  snapshotUrl: "https://blob.test",
  embedConfig: DEFAULT_EMBED_CONFIG,
  contact: { naam: 'Groen & "Zoon"', telefoon: "06 12345678", email: "info@groen.nl", kleur: "#15803d" },
};

describe("bouwEmbedCode", () => {
  it("heeft een inline script van minder dan 2 KB", () => {
    const code = bouwEmbedCode(opties);
    const script = code.slice(code.indexOf("<script>") + 8, code.indexOf("</script>"));
    expect(new TextEncoder().encode(script).length).toBeLessThan(2048);
    expect(() => new Function(script)).not.toThrow();
  });

  it("blijft onder 2 KB met realistische (lange) adressen", () => {
    const code = bouwEmbedCode({
      ...opties,
      toolId: "cmabcdefghijklmnopqrstuvw",
      baseUrl: "https://www.kostenplan.nl",
      reserveUrl: "https://kostenplan-reserve.mijnaccount.workers.dev",
    });
    const script = code.slice(code.indexOf("<script>") + 8, code.indexOf("</script>"));
    expect(new TextEncoder().encode(script).length).toBeLessThan(2048);
  });

  it("zet de contactgegevens als data-attributen en ontsnapt ze", () => {
    const code = bouwEmbedCode(opties);
    expect(code).toContain('data-tel="06 12345678"');
    expect(code).toContain('data-mail="info@groen.nl"');
    expect(code).toContain("Groen &amp; &quot;Zoon&quot;");
    expect(code).toContain('data-kostenplan="tool123"');
  });

  it("verwijst naar het versie-bestand en het reserve-adres", () => {
    const code = bouwEmbedCode(opties);
    expect(code).toContain("https://app.test/kp/v2.js");
    expect(code).toContain("https://reserve.test/kp/v2.js");
  });

  it("laat attributen weg die niet zijn ingevuld", () => {
    const code = bouwEmbedCode({ ...opties, reserveUrl: null, contact: { naam: "X" } });
    expect(code).not.toContain("data-tel");
    expect(code).not.toContain("data-mail");
    expect(code).not.toContain("reserve.test");
  });
});

describe("varianten", () => {
  it("zet weergave, plaatsing, knop en onderdelen als data-attributen", () => {
    const code = bouwEmbedCode({ ...opties, variant: { weergave: "tegels", plaatsing: "popup", knopTekst: "Bereken je schutting", knopPositie: "rechtsonder", onderdelen: ["abc1"] } });
    expect(code).toContain('data-weergave="tegels"');
    expect(code).toContain('data-plaatsing="popup"');
    expect(code).toContain('data-knop="Bereken je schutting"');
    expect(code).toContain('data-positie="rechtsonder"');
    expect(code).toContain('data-onderdelen="abc1"');
    // Een pop-up heeft geen vaste hoogte of rand op de pagina.
    expect(code).not.toContain("min-height:600px");
  });

  it("zonder variant staan er geen extra attributen", () => {
    const code = bouwEmbedCode(opties);
    for (const a of ["data-weergave", "data-plaatsing", "data-knop", "data-positie", "data-onderdelen"]) expect(code).not.toContain(a);
  });

  it("ongeldige waarden komen niet in de code", () => {
    const code = bouwEmbedCode({ ...opties, variant: { weergave: '"><script>' as never, onderdelen: ['"><x', "ok1"] } });
    expect(code).not.toContain("<script>alert");
    expect(code).not.toContain("data-weergave");
    expect(code).toContain('data-onderdelen="ok1"');
  });

  it("het iframe-alternatief krijgt weergave en onderdelen in het adres", () => {
    const code = bouwIframeCode({ ...opties, variant: { weergave: "stappen", onderdelen: ["a1", "b2"] } });
    expect(code).toContain('src="https://app.test/embed/tool123?weergave=stappen&amp;onderdelen=a1%2Cb2"');
  });
});

describe("bouwIframeCode", () => {
  it("heeft een iframe en een verborgen contactkaart", () => {
    const code = bouwIframeCode(opties);
    expect(code).toContain('src="https://app.test/embed/tool123"');
    expect(code).toContain("hidden");
    expect(code).toContain("tel:06 12345678".replace(" ", ""));
  });
});
