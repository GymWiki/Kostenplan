import { describe, expect, it } from "vitest";
import { onbekendeTokens, ontbrekendeVerplichte, parseSjabloon, renderTemplate, serialiseerSjabloon, tokensIn, variabeleOp, verplaatsVariabele, verwijderVariabeleOp, voegVariabeleIn } from "./render";

describe("renderTemplate", () => {
  it("vult alle variabelen, ook dubbele", () => {
    expect(renderTemplate("Beste {naam}, {naam} van {handelsnaam}", { naam: "Jan", handelsnaam: "De Boer" })).toBe("Beste Jan, Jan van De Boer");
  });
  it("ontbrekende of onbekende variabelen worden leeg, nooit 'undefined' of 'null'", () => {
    expect(renderTemplate("a{x}b{y}c{z}d", { x: undefined, y: null })).toBe("abcd");
    expect(renderTemplate("{constructor}{toString}{__proto__}", {})).toBe("");
  });
  it("cijfers worden tekst; 0 blijft 0", () => {
    expect(renderTemplate("{n} maanden, {nul}", { n: 12, nul: 0 })).toBe("12 maanden, 0");
  });
  it("waarden worden nooit als HTML of als nieuwe variabele uitgelegd", () => {
    const uit = renderTemplate("Beste {naam}, {totaal}", { naam: "A & B <script>alert(1)</script> {totaal}", totaal: "€ 10" });
    expect(uit).toBe("Beste A & B <script>alert(1)</script> {totaal}, € 10");
  });
  it("accolades die geen variabele zijn blijven staan", () => {
    expect(renderTemplate("{ naam } {} {1+1} {naam-x}", { naam: "Jan" })).toBe("{ naam } {} {1+1} {naam-x}");
  });
  it("lege tekst blijft leeg", () => {
    expect(renderTemplate("", { naam: "Jan" })).toBe("");
  });
});

describe("parseSjabloon en serialiseren", () => {
  const tekst = "Geachte {naam},\n\nOfferte {nummer} voor {onderwerp}.\n{link}\n{ onbekend } {x_y}";
  it("geeft exact dezelfde tekst terug", () => {
    expect(serialiseerSjabloon(parseSjabloon(tekst))).toBe(tekst);
    expect(serialiseerSjabloon(parseSjabloon(""))).toBe("");
  });
  it("kent de stukken", () => {
    expect(parseSjabloon("a {naam} b")).toEqual([{ soort: "tekst", tekst: "a " }, { soort: "variabele", key: "naam" }, { soort: "tekst", tekst: " b" }]);
  });
  it("tokensIn geeft alle variabelen in volgorde", () => {
    expect(tokensIn("{a}{b}{a}")).toEqual(["a", "b", "a"]);
  });
});

describe("variabelen in de tekst bewerken", () => {
  it("invoegen aan het begin, in het midden en aan het eind", () => {
    expect(voegVariabeleIn("Hallo wereld", 0, "naam")).toEqual({ tekst: "{naam}Hallo wereld", cursor: 6 });
    expect(voegVariabeleIn("Hallo wereld", 5, "naam")).toEqual({ tekst: "Hallo{naam} wereld", cursor: 11 });
    expect(voegVariabeleIn("Hallo wereld", 12, "naam")).toEqual({ tekst: "Hallo wereld{naam}", cursor: 18 });
    expect(voegVariabeleIn("Hallo", 99, "naam").tekst).toBe("Hallo{naam}");
  });
  it("hetzelfde blokje mag meerdere keren", () => {
    const a = voegVariabeleIn("x", 1, "naam");
    expect(voegVariabeleIn(a.tekst, 0, "naam").tekst).toBe("{naam}x{naam}");
  });
  it("verwijderen haalt het hele blokje weg", () => {
    expect(verwijderVariabeleOp("a{naam}b", 1)).toEqual({ tekst: "ab", cursor: 1 });
    expect(verwijderVariabeleOp("a{naam}b", 0).tekst).toBe("a{naam}b");
  });
  it("variabeleOp herkent alleen een heel blokje", () => {
    expect(variabeleOp("a{naam}b", 1)).toEqual({ key: "naam", lengte: 6 });
    expect(variabeleOp("a{naam}b", 2)).toBeNull();
  });
  it("verplaatsen naar voren, naar achteren en op dezelfde plek", () => {
    expect(verplaatsVariabele("ab{naam}cd", 2, 0)).toEqual({ tekst: "{naam}abcd", cursor: 6 });
    expect(verplaatsVariabele("ab{naam}cd", 2, 10)).toEqual({ tekst: "abcd{naam}", cursor: 10 });
    expect(verplaatsVariabele("ab{naam}cd", 2, 9)).toEqual({ tekst: "abc{naam}d", cursor: 9 });
    // Direct voor, in of direct na zichzelf neerzetten verandert niets.
    for (const naar of [2, 5, 8]) expect(verplaatsVariabele("ab{naam}cd", 2, naar).tekst).toBe("ab{naam}cd");
  });
});

describe("controles", () => {
  it("onbekende en niet-beschikbare variabelen worden gemeld, niet verwijderd", () => {
    expect(onbekendeTokens("{naam} {oudeNaam} {vervaldatum}", "offerte")).toEqual(["oudeNaam", "vervaldatum"]);
    expect(onbekendeTokens("{naam} {vervaldatum} {iban}", "factuur")).toEqual([]);
  });
  it("ontbrekende verplichte variabelen geven een waarschuwing", () => {
    const eisen = [{ key: "link", waarschuwing: "Link mist" }];
    expect(ontbrekendeVerplichte("zonder", "factuur", eisen)).toEqual(["Link mist"]);
    expect(ontbrekendeVerplichte("met {link}", "factuur", eisen)).toEqual([]);
  });
});
