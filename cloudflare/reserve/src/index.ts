import { valideerLead } from "../../../app/lib/lead-validatie";
import { LOADER_BESTANDEN } from "./assets.generated";

// Kostenplan-reserve op Cloudflare (niveau 2). Doet vier dingen:
//  1. serveert een kopie van de gepubliceerde rekentool-bestanden (snapshots),
//     die de app bij elke publicatie hier neerzet (PUT /mirror/<toolId>);
//  2. serveert dezelfde versie-bestanden van het laadscript (/kp/vN.js);
//  3. neemt aanvragen aan als de app niet bereikbaar is (POST /lead):
//     zelfde controles, limiet per IP, en een sleutel zodat dezelfde aanvraag
//     maar één keer wordt bewaard;
//  4. laat de app die aanvragen later ophalen (GET /ingest) en afvinken
//     (POST /ingest/ack).

// Minimale vormen van de Cloudflare-bindings, zodat dit zonder extra pakketten test en bouwt.
export interface BucketLike {
  get(key: string): Promise<{ text(): Promise<string>; httpEtag?: string } | null>;
  put(key: string, value: string, opties?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string | string[]): Promise<void>;
  list(opties: { prefix: string; limit?: number }): Promise<{ objects: { key: string }[] }>;
}
export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opties?: { expirationTtl?: number }): Promise<void>;
}
export interface Env {
  SNAPSHOTS: BucketLike;
  LIMIET?: KvLike;
  MIRROR_TOKEN: string;
  INGEST_TOKEN: string;
}

const MAX_BYTES = 64 * 1024;
const LIMIET_PER_MINUUT = 10;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-max-age": "86400",
};

function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS, ...extra },
  });
}

function heeftToken(request: Request, token: string | undefined) {
  return Boolean(token) && request.headers.get("authorization") === `Bearer ${token}`;
}

async function leesBegrensd(request: Request): Promise<string | null> {
  const tekst = await request.text();
  return tekst.length > MAX_BYTES ? null : tekst;
}

async function metLimiet(env: Env, ip: string, nu: number): Promise<boolean> {
  if (!env.LIMIET) return true;
  const sleutel = `rl:${ip}:${Math.floor(nu / 60000)}`;
  try {
    const huidig = Number((await env.LIMIET.get(sleutel)) ?? "0");
    if (huidig >= LIMIET_PER_MINUUT) return false;
    await env.LIMIET.put(sleutel, String(huidig + 1), { expirationTtl: 120 });
  } catch {
    // limiet-opslag onbereikbaar: liever een aanvraag te veel dan er één missen
  }
  return true;
}

export async function handle(request: Request, env: Env, nu = Date.now()): Promise<Response> {
  const url = new URL(request.url);
  const pad = url.pathname;

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (pad === "/health") return json({ ok: true });

  // 1. Snapshots
  const snap = /^\/s\/([A-Za-z0-9_-]{1,64})\/(latest|v\d+)\.json$/.exec(pad);
  if (snap && request.method === "GET") {
    const obj = await env.SNAPSHOTS.get(`s/${snap[1]}/${snap[2]}.json`);
    if (!obj) return json({ ok: false }, 404);
    return new Response(await obj.text(), {
      headers: {
        "content-type": "application/json",
        "cache-control": snap[2] === "latest" ? "public, max-age=30" : "public, max-age=31536000, immutable",
        ...CORS,
      },
    });
  }

  // 2. Laadscript
  const loader = /^\/kp\/(v\d+\.js)$/.exec(pad);
  if (loader && request.method === "GET") {
    const inhoud = LOADER_BESTANDEN[loader[1]];
    if (!inhoud) return json({ ok: false }, 404);
    return new Response(inhoud, {
      headers: {
        "content-type": "text/javascript; charset=utf-8",
        "cache-control": "public, max-age=31536000, immutable",
        ...CORS,
      },
    });
  }

  // Spiegel schrijven (alleen de app)
  const spiegel = /^\/mirror\/([A-Za-z0-9_-]{1,64})$/.exec(pad);
  if (spiegel && request.method === "PUT") {
    if (!heeftToken(request, env.MIRROR_TOKEN)) return json({ ok: false }, 401);
    const tekst = await leesBegrensd(request);
    if (tekst === null) return json({ ok: false }, 413);
    let versie: unknown;
    try {
      const doc = JSON.parse(tekst) as { toolId?: unknown; versie?: unknown };
      if (doc.toolId !== spiegel[1]) return json({ ok: false }, 400);
      versie = doc.versie;
    } catch {
      return json({ ok: false }, 400);
    }
    if (typeof versie !== "number" || !Number.isInteger(versie) || versie < 0) return json({ ok: false }, 400);
    const opties = { httpMetadata: { contentType: "application/json" } };
    await env.SNAPSHOTS.put(`s/${spiegel[1]}/v${versie}.json`, tekst, opties);
    await env.SNAPSHOTS.put(`s/${spiegel[1]}/latest.json`, tekst, opties);
    return json({ ok: true });
  }

  // 3. Reserve voor aanvragen
  if (pad === "/lead" && request.method === "POST") {
    const ip = request.headers.get("cf-connecting-ip") ?? "onbekend";
    if (!(await metLimiet(env, ip, nu))) return json({ ok: false, error: "Te veel verzoeken." }, 429);
    const tekst = await leesBegrensd(request);
    if (tekst === null) return json({ ok: false, error: "Te groot." }, 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(tekst) as Record<string, unknown>;
    } catch {
      return json({ ok: false, error: "Ongeldige aanvraag." }, 400);
    }
    if (!body || typeof body !== "object") return json({ ok: false, error: "Ongeldige aanvraag." }, 400);
    const uitslag = valideerLead(body);
    if (!uitslag.ok) return json({ ok: false, fieldErrors: uitslag.fieldErrors }, 400);
    const sleutel = `leads/${uitslag.lead.sleutel}.json`;
    if (!(await env.SNAPSHOTS.get(sleutel))) {
      await env.SNAPSHOTS.put(sleutel, JSON.stringify({ ...uitslag.lead, ontvangenOp: new Date(nu).toISOString() }), {
        httpMetadata: { contentType: "application/json" },
      });
    }
    return json({ ok: true, reserve: true });
  }

  // 4. Ophalen door de app
  if (pad === "/ingest" && request.method === "GET") {
    if (!heeftToken(request, env.INGEST_TOKEN)) return json({ ok: false }, 401);
    const lijst = await env.SNAPSHOTS.list({ prefix: "leads/", limit: 20 });
    const leads: unknown[] = [];
    for (const { key } of lijst.objects) {
      const obj = await env.SNAPSHOTS.get(key);
      if (obj) leads.push(JSON.parse(await obj.text()));
    }
    return json({ ok: true, leads });
  }
  if (pad === "/ingest/ack" && request.method === "POST") {
    if (!heeftToken(request, env.INGEST_TOKEN)) return json({ ok: false }, 401);
    const tekst = await leesBegrensd(request);
    let sleutels: unknown;
    try {
      sleutels = (JSON.parse(tekst ?? "{}") as { sleutels?: unknown }).sleutels;
    } catch {
      return json({ ok: false }, 400);
    }
    if (!Array.isArray(sleutels) || !sleutels.every((s) => typeof s === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(s))) {
      return json({ ok: false }, 400);
    }
    if (sleutels.length > 0) await env.SNAPSHOTS.delete((sleutels as string[]).map((s) => `leads/${s}.json`));
    return json({ ok: true, verwijderd: sleutels.length });
  }

  return json({ ok: false }, 404);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch {
      return json({ ok: false }, 500);
    }
  },
};

export default worker;
