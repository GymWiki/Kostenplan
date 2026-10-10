import { describe, expect, it } from "vitest";
import { ruimGastenOp, type OpruimAfhankelijkheden } from "./gast-opruimen";

const DAG = 24 * 60 * 60 * 1000;
const nu = new Date("2026-10-20T03:00:00Z");

function bouw(gebruikers: { id: string; aangemaakt: Date; anoniem: boolean; bedrijven: string[]; bestanden: number }[]) {
  const log: string[] = [];
  const staat = new Map(gebruikers.map((g) => [g.id, { ...g }]));
  const deps: OpruimAfhankelijkheden = {
    async zoekVerlopenGasten(grens) {
      return [...staat.values()].filter((g) => g.anoniem && g.aangemaakt < grens).map((g) => g.id);
    },
    async bedrijvenVan(id) {
      return (staat.get(id)?.bedrijven ?? []).map((b) => ({ id: b }));
    },
    async verwijderBestanden(c) {
      log.push(`bestanden:${c}`);
      const g = [...staat.values()].find((x) => x.bedrijven.includes(c))!;
      return g.bestanden;
    },
    async verwijderBedrijf(c) {
      log.push(`bedrijf:${c}`);
    },
    async verwijderGebruiker(id) {
      log.push(`gebruiker:${id}`);
      staat.delete(id);
    },
  };
  return { deps, log, staat };
}

describe("ruimGastenOp", () => {
  it("verwijdert een gast van 8 dagen volledig, in de juiste volgorde", async () => {
    const { deps, log } = bouw([{ id: "g8", aangemaakt: new Date(nu.getTime() - 8 * DAG), anoniem: true, bedrijven: ["c8"], bestanden: 3 }]);
    const r = await ruimGastenOp(deps, nu);
    expect(r).toEqual({ gasten: 1, bedrijven: 1, bestanden: 3, fouten: [] });
    expect(log).toEqual(["bestanden:c8", "bedrijf:c8", "gebruiker:g8"]);
  });

  it("laat een jonge gast en een gekoppeld account ongemoeid", async () => {
    const { deps, log, staat } = bouw([
      { id: "jong", aangemaakt: new Date(nu.getTime() - 3 * DAG), anoniem: true, bedrijven: ["c1"], bestanden: 1 },
      { id: "account", aangemaakt: new Date(nu.getTime() - 30 * DAG), anoniem: false, bedrijven: ["c2"], bestanden: 1 },
    ]);
    const r = await ruimGastenOp(deps, nu);
    expect(r.gasten).toBe(0);
    expect(log).toEqual([]);
    expect(staat.size).toBe(2);
  });

  it("houdt alles staan als het verwijderen van bestanden mislukt", async () => {
    const { deps, log } = bouw([{ id: "g8", aangemaakt: new Date(nu.getTime() - 8 * DAG), anoniem: true, bedrijven: ["c8"], bestanden: 1 }]);
    deps.verwijderBestanden = async () => {
      throw new Error("storage stuk");
    };
    const r = await ruimGastenOp(deps, nu);
    expect(r.gasten).toBe(0);
    expect(r.fouten[0]).toContain("storage stuk");
    expect(log).toEqual([]);
  });
});
