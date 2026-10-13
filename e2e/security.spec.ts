import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { test, expect, seed } from "./fixtures";

// Action-id uit de productiebuild (.next/server/server-reference-manifest.json): zo roept een aanvaller een server action rechtstreeks aan.
function actionId(naam: string): string {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, "../.next/server/server-reference-manifest.json"), "utf8")) as { node: Record<string, { workers: Record<string, { exportedName: string }> }> };
  const id = Object.keys(m.node).find((k) => Object.values(m.node[k]!.workers).some((w) => w.exportedName === naam));
  if (!id) throw new Error(`server action ${naam} niet gevonden in de manifest`);
  return id;
}
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();


// Hovenier B (Gratis) probeert data van hovenier A te lezen of te wijzigen. Verwacht: nooit data, nooit een 200 met inhoud van A.
test.describe("beveiliging: B tegen A", () => {
  test.use({ gebruiker: "b" });

  test("lead, offerte en factuur van A zijn niet te openen met de URL", async ({ page }) => {
    const a = seed().a1;
    const paden = [
      `/dashboard/leads/${a.leads["akkoord"]}/offerte`,
      `/dashboard/facturen/${a.facturen["verstuurd"]}`,
      `/api/facturen/${a.facturen["verstuurd"]}/pdf`,
    ];
    for (const pad of paden) {
      const r = await page.goto(pad);
      const tekst = await page.locator("body").innerText();
      expect([404, 403, 307, 200], pad).toContain(r?.status());
      expect(tekst, `${pad} lekt gegevens van A`).not.toMatch(/Ahmed Akkoord|Gerrit Gefactureerd|De Vries|F2026-/);
    }
  });

  test("de export bevat alleen facturen van B", async ({ request }) => {
    const r = await request.get("/api/facturen/export?formaat=csv");
    const tekst = await r.text();
    expect(tekst).not.toMatch(/F2026-/);
  });

  test("het beheerpaneel van een factuur van A is voor B onzichtbaar (server actions werken niet over bedrijven heen)", async ({ page }) => {
    await page.goto("/dashboard");
    const res = await page.evaluate(async (id) => (await fetch(`/api/facturen/${id}/pdf`)).status, seed().a1.facturen["verstuurd"]);
    expect([404, 401, 403]).toContain(res);
  });

  // #67: B roept registreerBetalingAction rechtstreeks aan met het factuur-id van A.
  test("B kan met een directe server-action-aanroep geen betaling registreren op een factuur van A (#67)", async ({ request }) => {
    const id = seed().a1.facturen["verstuurd"]!;
    const stand = () => sql(`select (select count(*) from "FactuurBetaling" where "factuurId"='${id}') || ':' || (select status from "Factuur" where id='${id}') || ':' || (select count(*) from "FactuurGebeurtenis" where "factuurId"='${id}')`);
    const voor = stand();
    const res = await request.post("/dashboard", {
      headers: { "Next-Action": actionId("registreerBetalingAction"), "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component" },
      data: JSON.stringify([{ factuurId: id, bedragCenten: 100, datum: new Date().toISOString().slice(0, 10), methode: "OVERBOEKING", notitie: "aanval" }]),
    });
    const tekst = await res.text();
    expect(tekst).not.toMatch(/"ok":\s*true/);
    expect(stand(), "betaling, status of tijdlijn van A is veranderd").toBe(voor);
  });

  test("een gok op een factuur- of offertelink geeft 404", async ({ request }) => {
    for (const pad of ["/f/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "/o/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "/f/../etc/passwd"]) {
      expect((await request.get(pad)).status(), pad).toBe(404);
    }
  });
});

test.describe("beveiliging: niet ingelogd", () => {
  test("dashboard en export verwijzen naar inloggen", async ({ request }) => {
    for (const pad of ["/dashboard", "/dashboard/facturen", "/api/facturen/export?formaat=csv"]) {
      const r = await request.get(pad, { maxRedirects: 0 });
      expect([301, 302, 303, 307, 308, 401, 403], pad).toContain(r.status());
    }
  });
  test("de testpagina's bestaan niet zonder TEST_PAGES", async () => {
    expect(process.env.NODE_ENV).not.toBe("production-site");
  });
});
