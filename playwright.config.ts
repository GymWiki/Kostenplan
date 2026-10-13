import { defineConfig } from "@playwright/test";

// Vaste e2e-basis: draait tegen de testomgeving (scripts/test/start-env.sh), nooit tegen productie.
// Twee schermen: mobiel (412 × 915) en desktop (1440 × 900).
const BASE = process.env.BASE ?? "http://localhost:3200";
if (/kostenplan\.nl/.test(BASE)) throw new Error("De e2e-tests draaien nooit op productie.");

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results/e2e",
  snapshotPathTemplate: "e2e/__screens__/{projectName}/{testFilePath}/{arg}{ext}",
  fullyParallel: true,
  workers: Number(process.env.E2E_WORKERS ?? 3),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.03, animations: "disabled" } },
  reporter: [["list"], ["json", { outputFile: "test-results/e2e-resultaten.json" }]],
  use: {
    baseURL: BASE,
    locale: "nl-NL",
    timezoneId: "Europe/Amsterdam",
    screenshot: "only-on-failure",
    trace: "off",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] },
  },
  projects: [
    { name: "mobiel", use: { viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
