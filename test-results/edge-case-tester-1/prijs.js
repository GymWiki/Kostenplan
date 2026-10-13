const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json");
const url = "/dashboard/tools/" + seed.a3.tools.tuinaanleg + "/bouwer";
const idxVan = (s, val) => s.page.evaluate((v) => [...document.querySelectorAll("input")].findIndex(e => e.type === "text" && e.value === v), val);
(async () => {
  const s = await k.open({ agent: "edge-case-tester-1", gebruiker: "a3", viewport: "desktop", pad: url, maxStappen: 250 });
  const open = async () => { await s.page.getByRole("button", { name: /^Schutting/ }).first().click(); await s.page.waitForTimeout(900); };
  await open();
  const waarden = ["", "-10", "1000000000", "12,50", "abc"];
  for (const w of waarden) {
    let i = await idxVan(s, "85");
    if (i < 0) { console.log("veld 85 niet gevonden voor", w); break; }
    const veld = s.page.locator("input").nth(i);
    await veld.fill(w);
    await veld.press("Tab");
    await s.page.waitForTimeout(1200);
    const melding = await s.page.evaluate(() => [...document.querySelectorAll("[role=alert],[aria-live],.text-red-600,.text-destructive,[class*=error],[class*=rood],[class*=danger]")].map(e => e.innerText.trim()).filter(Boolean).slice(0, 4));
    console.log(`INVOER ${JSON.stringify(w)} -> veld nu ${JSON.stringify(await veld.inputValue())}; meldingen: ${JSON.stringify(melding)}`);
    await s.scherm("prijs-" + (w || "leeg").replace(/[^a-z0-9]/gi, "x"));
    // Herlaad om te zien of het bewaard is
    await s.page.reload({ waitUntil: "networkidle" });
    await s.page.waitForTimeout(800);
    await open();
    const j = await idxVan(s, w === "" ? "" : w.replace(",", ",")).catch(() => -1);
    const bewaard = await s.page.evaluate(() => [...document.querySelectorAll("input")].filter(e => e.type === "text").map(e => e.value).filter(v => /^-?\d[\d.,]*$|^$/.test(v) || v === "abc").slice(0, 12));
    console.log("   na reload, numerieke velden:", JSON.stringify(bewaard));
    if (w !== "abc") { await s.page.evaluate(() => 0); }
    i = await idxVan(s, "85"); if (i < 0) { console.log("   85 weg na reload; stoppen"); break; }
  }
  console.log("CONSOLE", s.consoleFouten.slice(-4), "NET", s.netwerkFouten.slice(-3));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message.slice(0, 400)); process.exit(1); });
