import { test as basis, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cookie, GEBRUIKERS } = require("../scripts/test/ids.js");

export type Gebruiker = keyof typeof GEBRUIKERS;
export type Seed = { a1: SeedA; a2: SeedA; a3: SeedA; b: { company1: string; tools: { rekentool: string } } };
export type SeedA = { bedrijfSlug: string; tuinaanlegSlug: string; factuurTokens: Record<string, string>; offerteTokens: Record<string, string>; company1: string; company2: string; tools: { tuinaanleg: string; onderhoud: string; heggen: string }; leads: Record<string, string>; facturen: Record<string, string> };

export const seed = (): Seed => JSON.parse(fs.readFileSync(path.join(__dirname, "../test-results/seed.json"), "utf8"));

// Een test met een ingelogde testgebruiker:  test.use({ gebruiker: "a1" })
// Tests die de weergave-instelling van de rekentool wijzigen of daarvan afhangen, wachten op elkaar: per hovenier (mobiel = a1,
// desktop = a2) is er één "slot". Het slot zet de rekentool terug op de standaard (leeg = alles op één pagina) en geeft hem weer vrij.
const slotSql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/kp", "-t", "-A", "-c", q]).toString().trim();

export const test = basis.extend<{ gebruiker: Gebruiker | "auto" | null; axe: (naam?: string) => Promise<void>; toolSlot: void }>({
  toolSlot: [
    async ({}, gebruik, info) => {
      const eigen = info.project.name === "mobiel" ? "a1" : "a2";
      const map = path.join(require("node:os").tmpdir(), `kp-e2e-slot-${eigen}`);
      const begin = Date.now();
      for (;;) {
        try {
          fs.mkdirSync(map);
          break;
        } catch {
          // Een slot dat langer dan 3 minuten bezet is, is van een afgebroken test.
          try {
            if (Date.now() - fs.statSync(map).mtimeMs > 180_000) fs.rmdirSync(map);
          } catch {}
          if (Date.now() - begin > 600_000) throw new Error("Wachten op het slot van de rekentool duurde te lang.");
          await new Promise((r) => setTimeout(r, 300));
        }
      }
      const toolId = seed()[eigen].tools.tuinaanleg;
      slotSql(`UPDATE "Tool" SET "weergaveConfig" = '{}'::jsonb WHERE id = '${toolId}'`);
      try {
        await gebruik();
      } finally {
        slotSql(`UPDATE "Tool" SET "weergaveConfig" = '{}'::jsonb WHERE id = '${toolId}'`);
        try {
          fs.rmdirSync(map);
        } catch {}
      }
    },
    { auto: false },
  ],
  gebruiker: [null, { option: true }],
  context: async ({ context, gebruiker, baseURL }, gebruik, info) => {
    const g = gebruiker === "auto" ? (info.project.name === "mobiel" ? "a1" : "a2") : gebruiker;
    if (g) await context.addCookies([cookie(GEBRUIKERS[g], baseURL)]);
    await gebruik(context);
  },
  // axe-core op de pagina; faalt bij serious/critical (AXE_SOFT=1: alleen melden).
  axe: async ({ page }, gebruik) => {
    await gebruik(async (naam = "pagina") => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bron: string = require("axe-core").source;
      await page.evaluate(bron);
      const r = (await page.evaluate(() => (window as unknown as { axe: { run: (c: Document, o: object) => Promise<{ violations: { id: string; impact: string; help: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }))) as { violations: { id: string; impact: string; help: string; nodes: { target: string[] }[] }[] };
      const ernstig = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      const tekst = ernstig.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length}× bijv. ${v.nodes[0]?.target?.join(" ")}`).join("\n");
      if (process.env.AXE_SOFT === "1") {
        if (tekst) console.log(`[axe ${naam}]\n${tekst}`);
        return;
      }
      expect(ernstig, `axe op ${naam}:\n${tekst}`).toEqual([]);
    });
  },
});
export { expect };

// Wacht tot de pagina rustig is (geen lopende netwerkverzoeken) en er geen Next-foutscherm staat.
export async function rustig(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator("text=/Application error|Internal Server Error|This page couldn.t load/")).toHaveCount(0);
}

// Maskeert wat per dag verandert (datums, "x dagen geleden") bij visuele regressie.
export const dynamisch = (page: Page) => [page.locator("time"), page.getByText(/\d+ (dagen?|uur|minuten) (geleden|te laat)|oktober|november|september|\d{1,2}-\d{1,2}-\d{4}/)];

// Mobiel en desktop draaien parallel: wie data wijzigt, gebruikt een eigen kopie van hovenier A (mobiel = a1, desktop = a2).
export const eigenA = (projectNaam: string): "a1" | "a2" => (projectNaam === "mobiel" ? "a1" : "a2");

// De browser praat rechtstreeks met PDOK; in de testomgeving krijgt hij dezelfde nep-antwoorden als de server (scripts/mobile-ux/fake-pdok.js).
export async function pdokNep(context: import("@playwright/test").BrowserContext) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { antwoord, TEGEL } = require("../scripts/mobile-ux/fake-pdok.js");
  await context.route("https://api.pdok.nl/**", (route) => {
    const r = antwoord(route.request().url());
    return route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(r.body) });
  });
  await context.route("https://service.pdok.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
}
