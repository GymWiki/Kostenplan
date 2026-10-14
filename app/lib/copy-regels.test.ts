import { describe, expect, it } from "vitest";
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

// Copy-regel: in de UI heet het "onderdeel"; het woord "werkzaamheid" komt niet
// meer voor in teksten die een gebruiker leest. Interne code-, route- en
// databasenamen (bijv. `werkzaamheid:<id>` in de URL) blijven zoals ze zijn.
const SKIP_BESTAND = /api\/landing-event|factuur\/export\.ts|landing\/track\.ts|probeer\/lokale-repository|lib\/draft\.ts|laad-editor|calculator-engine|generated/;

function bestanden(map: string, uit: string[] = []): string[] {
  for (const e of fs.readdirSync(map, { withFileTypes: true })) {
    if (["node_modules", ".next", "generated"].includes(e.name)) continue;
    const p = path.join(map, e.name);
    if (e.isDirectory()) bestanden(p, uit);
    else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) uit.push(p);
  }
  return uit;
}

function uiTeksten(bestand: string): { regel: number; tekst: string }[] {
  const src = fs.readFileSync(bestand, "utf8");
  const sf = ts.createSourceFile(bestand, src, ts.ScriptTarget.Latest, true, bestand.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const gevonden: { regel: number; tekst: string }[] = [];
  (function bezoek(n: ts.Node) {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    const tekst = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n);
    if (tekst) {
      const raw = n.getText();
      const intern =
        /werkzaamheid:|\/#werkzaamheden/.test(raw) ||
        (ts.isJsxAttribute(n.parent) && ["id", "href"].includes(n.parent.name.getText())) ||
        ts.isLiteralTypeNode(n.parent) ||
        (ts.isPropertyAssignment(n.parent) && n.parent.name === n);
      if (!intern) gevonden.push({ regel: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, tekst: raw.replace(/\s+/g, " ").trim() });
    }
    ts.forEachChild(n, bezoek);
  })(sf);
  return gevonden;
}

describe("copy: onderdeel in plaats van werkzaamheid", () => {
  const root = path.join(process.cwd(), "app");
  const alle = bestanden(root).filter((f) => !SKIP_BESTAND.test(f));

  it('kent het woord "werkzaamheid" niet meer in UI-teksten', () => {
    const fout = alle.flatMap((f) => uiTeksten(f).filter((t) => /werkzaamhe/i.test(t.tekst)).map((t) => `${path.relative(process.cwd(), f)}:${t.regel} ${t.tekst.slice(0, 80)}`));
    expect(fout).toEqual([]);
  }, 20_000);

  it('noemt de zichtbaarheid-schakelaar overal "Zichtbaar" (niet "Op je website")', () => {
    const fout = alle.flatMap((f) => uiTeksten(f).filter((t) => /^["`']?Op je website["`']?$/.test(t.tekst)).map((t) => `${path.relative(process.cwd(), f)}:${t.regel}`));
    expect(fout).toEqual([]);
  }, 20_000);

  // Begrippen en teksten die in de UI niet (meer) mogen voorkomen (testronde 2026-10-13).
  const verboden: [RegExp, string][] = [
    [/kostencalculator/i, 'het heet "rekentool", niet "kostencalculator"'],
    [/\bPDOK\b/, "geen interne bronnamen (PDOK) in de UI"],
    [/TODO/, "ontwikkelaarsnotities horen in code-commentaar, niet in de UI"],
    [/(?<![\w-])items?(?![\w-])/i, 'Nederlands: "onderdelen"/"regels", niet "items"'],
    [/via iframe|link en embed|de iframe|\bembed-blok\b|\bEmbedcode\b/i, 'in de UI heet dit "insluiten" (de code is geen iframe)'],
    [/\b1 (onderdelen|regels|dagen|vragen)\b/i, 'enkelvoud bij 1 (gebruik meervoud() uit app/lib/meervoud.ts)'],
  ];
  for (const [regel, uitleg] of verboden) {
    it(`UI-teksten: ${uitleg}`, () => {
      const fout = alle.flatMap((f) => uiTeksten(f).filter((t) => regel.test(t.tekst)).map((t) => `${path.relative(process.cwd(), f)}:${t.regel} ${t.tekst.slice(0, 100)}`));
      expect(fout).toEqual([]);
    }, 20_000);
  }
});
