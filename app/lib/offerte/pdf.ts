import "server-only";
import { createHash } from "node:crypto";
import { footerTemplate } from "./pdf-footer";
import type { OfferteInhoud } from "./model";

// Offerte-PDF via headless Chromium. Chromium opent de printpagina van de app
// zelf (/offerte-print/[token]) — dezelfde OfferteDocument-component, CSS en
// lettertypes als op het scherm — en print die als PDF: vector-tekst
// (selecteerbaar), fonts ingebed en een tabel die netjes over pagina's breekt.
// De voettekst per pagina ("Pagina X van Y") komt uit Chromium's footer-template.

async function startBrowser() {
  const { chromium } = await import("playwright-core");
  const lokaal = process.env.CHROMIUM_PATH;
  const args = ["--no-sandbox", "--font-render-hinting=none"];
  if (lokaal) return chromium.launch({ executablePath: lokaal, headless: true, args });
  const sparticuz = (await import("@sparticuz/chromium")).default;
  return chromium.launch({ executablePath: await sparticuz.executablePath(), headless: true, args: [...sparticuz.args, ...args] });
}

export async function maakOffertePdf(printUrl: string, inhoud: Pick<OfferteInhoud, "nummer" | "versie" | "afzender">): Promise<Buffer> {
  const browser = await startBrowser();
  try {
    const context = await browser.newContext({
      extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : undefined,
    });
    const page = await context.newPage();
    const res = await page.goto(printUrl, { waitUntil: "networkidle", timeout: 25_000 });
    if (!res || !res.ok()) throw new Error(`Printpagina gaf ${res?.status() ?? "geen antwoord"}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector("[data-offerte-document]", { timeout: 5_000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: footerTemplate(inhoud),
      margin: { top: "20mm", right: "20mm", bottom: "26mm", left: "20mm" },
      preferCSSPageSize: false,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
