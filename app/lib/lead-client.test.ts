import { describe, expect, it, vi } from "vitest";
import {
  leegWachtrij,
  leesWachtrij,
  maakAanvraagTekst,
  maakMailtoLink,
  voegToeAanWachtrij,
  verstuurMetHerhaling,
  type LeadPayload,
} from "./lead-client";

function geheugen() {
  const d = new Map<string, string>();
  return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v) };
}

const payload: LeadPayload = {
  sleutel: "abcdefghijklmnopqrst",
  toolId: "t1",
  naam: "Piet",
  email: "piet@example.nl",
  telefoonnummer: "",
  snapshot: { regels: [{ naam: "Terras", aantal: 20, eenheid: "m²", materiaal: "Klinker" }], totaal: 1234.5 },
};
const geenSlaap = () => Promise.resolve();
const antwoord = (status: number, json: unknown = {}) => Promise.resolve(new Response(JSON.stringify(json), { status }));

describe("verstuurMetHerhaling", () => {
  it("verstuurt in één keer als het lukt", async () => {
    const fetchFn = vi.fn(() => antwoord(200, { ok: true }));
    const r = await verstuurMetHerhaling(payload, { fetchFn: fetchFn as unknown as typeof fetch, slaap: geenSlaap });
    expect(r).toEqual({ soort: "ok", viaReserve: false });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("probeert maximaal drie keer met oplopende wachttijd en geeft dan 'later'", async () => {
    const fetchFn = vi.fn(() => antwoord(503));
    const wachten: number[] = [];
    const r = await verstuurMetHerhaling(payload, {
      fetchFn: fetchFn as unknown as typeof fetch,
      slaap: (ms) => (wachten.push(ms), Promise.resolve()),
    });
    expect(r).toEqual({ soort: "later" });
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(wachten).toEqual([1000, 3000]);
  });

  it("stopt direct bij een definitieve afwijzing", async () => {
    const fetchFn = vi.fn(() => antwoord(400, { error: "Ongeldig" }));
    const r = await verstuurMetHerhaling(payload, { fetchFn: fetchFn as unknown as typeof fetch, slaap: geenSlaap });
    expect(r).toMatchObject({ soort: "definitief", error: "Ongeldig" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("valt na drie mislukte pogingen terug op de reserve-route", async () => {
    const fetchFn = vi.fn((url: string) => (url.includes("reserve") ? antwoord(200) : Promise.reject(new Error("net"))));
    const r = await verstuurMetHerhaling(payload, {
      fetchFn: fetchFn as unknown as typeof fetch,
      slaap: geenSlaap,
      reserveUrl: "https://reserve.test/lead",
    });
    expect(r).toEqual({ soort: "ok", viaReserve: true });
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it("stuurt dezelfde sleutel mee bij elke poging", async () => {
    const bodies: string[] = [];
    const fetchFn = vi.fn((_u: string, init?: RequestInit) => (bodies.push(String(init?.body)), antwoord(503)));
    await verstuurMetHerhaling(payload, { fetchFn: fetchFn as unknown as typeof fetch, slaap: geenSlaap });
    expect(new Set(bodies).size).toBe(1);
    expect(bodies[0]).toContain(payload.sleutel);
  });
});

describe("wachtrij", () => {
  it("bewaart een aanvraag en vervangt hem bij dezelfde sleutel", () => {
    const o = geheugen();
    voegToeAanWachtrij(payload, o);
    voegToeAanWachtrij({ ...payload, naam: "Piet Jansen" }, o);
    const lijst = leesWachtrij(o);
    expect(lijst).toHaveLength(1);
    expect(lijst[0].naam).toBe("Piet Jansen");
  });

  it("negeert aanvragen ouder dan 30 dagen", () => {
    const o = geheugen();
    voegToeAanWachtrij(payload, o, Date.now() - 31 * 24 * 3600 * 1000);
    expect(leesWachtrij(o)).toHaveLength(0);
  });

  it("leegt de wachtrij bij een volgend bezoek en verstuurt precies één keer", async () => {
    const o = geheugen();
    voegToeAanWachtrij(payload, o);
    const fetchFn = vi.fn(() => antwoord(200));
    const eerste = await leegWachtrij({ opslag: o, fetchFn: fetchFn as unknown as typeof fetch, toolId: "t1" });
    const tweede = await leegWachtrij({ opslag: o, fetchFn: fetchFn as unknown as typeof fetch, toolId: "t1" });
    expect(eerste).toEqual([payload.sleutel]);
    expect(tweede).toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("houdt de aanvraag bewaard als het weer niet lukt", async () => {
    const o = geheugen();
    voegToeAanWachtrij(payload, o);
    await leegWachtrij({ opslag: o, fetchFn: (() => antwoord(503)) as unknown as typeof fetch });
    expect(leesWachtrij(o)).toHaveLength(1);
  });

  it("gooit niet als localStorage ontbreekt of kapot is", () => {
    const kapot = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
    expect(() => voegToeAanWachtrij(payload, kapot)).not.toThrow();
    expect(leesWachtrij(kapot)).toEqual([]);
  });
});

describe("mailto-terugval", () => {
  it("heeft een samenvatting met werk, totaal en contactgegevens", () => {
    const tekst = maakAanvraagTekst(payload, "Groen BV", (n) => `€ ${n}`);
    expect(tekst).toContain("Terras – 20 m² (Klinker)");
    expect(tekst).toContain("€ 1234.5");
    expect(tekst).toContain("E-mail: piet@example.nl");
    const link = maakMailtoLink("info@groen.nl", "Aanvraag", tekst);
    expect(link.startsWith("mailto:info@groen.nl?subject=")).toBe(true);
    expect(decodeURIComponent(link)).toContain("Terras");
  });
});
