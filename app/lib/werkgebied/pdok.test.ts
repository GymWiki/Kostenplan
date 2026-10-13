import { beforeEach, describe, expect, it, vi } from "vitest";
import { leegPdokCache, parseDoc, zoekAdressen, zoekPostcodeHuisnummer, zoekPostcodeGebied } from "./pdok";

const doc = (o: Record<string, unknown> = {}) => ({ weergavenaam: "Dennenlaan 12, 3511AB Utrecht", centroide_ll: "POINT(5.12 52.09)", postcode: "3511AB", huis_nlt: "12", huisnummer: 12, straatnaam: "Dennenlaan", woonplaatsnaam: "Utrecht", ...o });
const antwoord = (docs: unknown[]) => ({ ok: true, json: async () => ({ response: { docs } }) }) as unknown as Response;

beforeEach(() => leegPdokCache());

describe("PDOK Locatieserver", () => {
  it("leest het adres en de coördinaten uit een antwoord (POINT(lon lat))", () => {
    expect(parseDoc(doc())).toMatchObject({ postcode: "3511AB", straat: "Dennenlaan", plaats: "Utrecht", lat: 52.09, lon: 5.12 });
    expect(parseDoc({ weergavenaam: "x" })).toBeNull();
  });

  it("zoekt het adres bij postcode en huisnummer", async () => {
    const fetchFn = vi.fn(async (_url: string) => antwoord([doc({ huis_nlt: "12a", huisnummer: 12 }), doc()]));
    const r = await zoekPostcodeHuisnummer("3511 ab", "12", "", { fetchFn: fetchFn as never });
    expect(r).toMatchObject({ ok: true, waarde: { huisnummer: "12" } });
    expect(String(fetchFn.mock.calls[0][0])).toContain("q=3511AB%2012");
  });

  it("geeft null (bestaat niet) als het adres er niet bij staat", async () => {
    const r = await zoekPostcodeHuisnummer("3511AB", "99", "", { fetchFn: (async () => antwoord([doc()])) as never });
    expect(r).toEqual({ ok: true, waarde: null });
  });

  it("een storing is geen fout maar { ok: false }, ook bij een time-out of een slecht antwoord", async () => {
    expect(await zoekPostcodeHuisnummer("3511AB", "12", "", { fetchFn: (async () => { throw new Error("netwerk"); }) as never })).toEqual({ ok: false, reden: "storing" });
    expect(await zoekPostcodeHuisnummer("3511AB", "13", "", { fetchFn: (async () => ({ ok: false, status: 503 })) as never })).toEqual({ ok: false, reden: "storing" });
    const traag = (async (_u: string, o: { signal: AbortSignal }) => new Promise((_r, rej) => o.signal.addEventListener("abort", () => rej(new Error("afgebroken"))))) as never;
    expect(await zoekPostcodeHuisnummer("3511AB", "14", "", { fetchFn: traag, timeoutMs: 20 })).toEqual({ ok: false, reden: "storing" });
  });

  it("onthoudt antwoorden kort", async () => {
    const fetchFn = vi.fn(async () => antwoord([doc()]));
    let tijd = 1000;
    const opties = { fetchFn: fetchFn as never, ttlMs: 60_000, nu: () => tijd };
    await zoekPostcodeHuisnummer("3511AB", "12", "", opties);
    await zoekPostcodeHuisnummer("3511AB", "12", "", opties);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    tijd += 61_000;
    await zoekPostcodeHuisnummer("3511AB", "12", "", opties);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("vraagt niets bij een te korte zoekterm of een ongeldige postcode", async () => {
    const fetchFn = vi.fn();
    expect(await zoekAdressen("35", { fetchFn: fetchFn as never })).toEqual({ ok: true, waarde: [] });
    expect(await zoekPostcodeHuisnummer("12", "1", "", { fetchFn: fetchFn as never })).toEqual({ ok: true, waarde: null });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("vindt een punt in een postcodegebied", async () => {
    const r = await zoekPostcodeGebied(8011, { fetchFn: (async () => antwoord([doc({ postcode: "8011AA", centroide_ll: "POINT(6.09 52.51)" })])) as never });
    expect(r).toMatchObject({ ok: true, waarde: { lat: 52.51, lon: 6.09 } });
  });
});
