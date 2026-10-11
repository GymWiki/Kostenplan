import { describe, expect, it } from "vitest";
import { handle, type BucketLike, type Env, type KvLike } from "./index";

function bucket(): BucketLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: async (k) => (data.has(k) ? { text: async () => data.get(k)! } : null),
    put: async (k, v) => void data.set(k, v),
    delete: async (k) => void (Array.isArray(k) ? k : [k]).forEach((x) => data.delete(x)),
    list: async ({ prefix, limit }) => ({ objects: [...data.keys()].filter((k) => k.startsWith(prefix)).slice(0, limit).map((key) => ({ key })) }),
  };
}
function kv(): KvLike {
  const d = new Map<string, string>();
  return { get: async (k) => d.get(k) ?? null, put: async (k, v) => void d.set(k, v) };
}
const env = (): Env => ({ SNAPSHOTS: bucket(), LIMIET: kv(), MIRROR_TOKEN: "m", INGEST_TOKEN: "i" });

const snapshot = { regels: [{ naam: "Terras" }], arbeidskosten: 1, materiaalkosten: 2, transportkosten: 0, voorrijkosten: 0, subtotaal: 3, btw: 0.6, totaal: 3.6 };
const lead = { toolId: "t1", naam: "Piet", email: "piet@example.nl", telefoonnummer: "", snapshot, sleutel: "abcdefghijklmnop1234" };
const post = (pad: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://r.test${pad}`, { method: "POST", body: JSON.stringify(body), headers: { "cf-connecting-ip": "1.2.3.4", ...headers } });

describe("reserve: aanvragen", () => {
  it("bewaart een geldige aanvraag precies één keer", async () => {
    const e = env();
    expect((await handle(post("/lead", lead), e)).status).toBe(200);
    expect((await handle(post("/lead", lead), e)).status).toBe(200);
    expect((e.SNAPSHOTS as ReturnType<typeof bucket>).data.size).toBe(1);
  });

  it("wijst een ongeldige aanvraag af met veldfouten", async () => {
    const res = await handle(post("/lead", { ...lead, email: "nee" }), env());
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.email).toBeTruthy();
  });

  it("beperkt het aantal aanvragen per IP per minuut", async () => {
    const e = env();
    const statussen: number[] = [];
    for (let i = 0; i < 12; i++) {
      statussen.push((await handle(post("/lead", { ...lead, sleutel: `abcdefghijklmnop${1000 + i}` }), e, 1_000_000)).status);
    }
    expect(statussen.filter((s) => s === 200)).toHaveLength(10);
    expect(statussen.filter((s) => s === 429)).toHaveLength(2);
  });

  it("weigert te grote aanvragen", async () => {
    const res = await handle(post("/lead", { ...lead, naam: "x".repeat(70_000) }), env());
    expect(res.status).toBe(413);
  });

  it("geeft CORS-headers voor de rekentool in de iframe", async () => {
    const res = await handle(new Request("https://r.test/lead", { method: "OPTIONS" }), env());
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("reserve: ophalen door de app", () => {
  it("vraagt om het juiste token", async () => {
    expect((await handle(new Request("https://r.test/ingest"), env())).status).toBe(401);
  });

  it("geeft wachtende aanvragen en verwijdert ze na bevestiging", async () => {
    const e = env();
    await handle(post("/lead", lead), e);
    const lijst = await (await handle(new Request("https://r.test/ingest", { headers: { authorization: "Bearer i" } }), e)).json();
    expect(lijst.leads).toHaveLength(1);
    expect(lijst.leads[0].sleutel).toBe(lead.sleutel);
    await handle(post("/ingest/ack", { sleutels: [lead.sleutel] }, { authorization: "Bearer i" }), e);
    const leeg = await (await handle(new Request("https://r.test/ingest", { headers: { authorization: "Bearer i" } }), e)).json();
    expect(leeg.leads).toHaveLength(0);
  });
});

describe("reserve: spiegel en laadscript", () => {
  const doc = { toolId: "t1", versie: 3, inhoudHash: "abc" };
  const put = (token: string) =>
    new Request("https://r.test/mirror/t1", { method: "PUT", body: JSON.stringify(doc), headers: { authorization: `Bearer ${token}` } });

  it("neemt een snapshot alleen aan met het juiste token", async () => {
    expect((await handle(put("fout"), env())).status).toBe(401);
  });

  it("serveert latest en de onveranderlijke versie na een spiegelactie", async () => {
    const e = env();
    expect((await handle(put("m"), e)).status).toBe(200);
    const latest = await handle(new Request("https://r.test/s/t1/latest.json"), e);
    expect((await latest.json()).versie).toBe(3);
    const v3 = await handle(new Request("https://r.test/s/t1/v3.json"), e);
    expect(v3.headers.get("cache-control")).toContain("immutable");
  });

  it("serveert het laadscript onveranderlijk", async () => {
    const res = await handle(new Request("https://r.test/kp/v1.js"), env());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(await res.text()).toContain("Kostenplan rekentool-loader");
  });
});
