const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json");
const url = "/dashboard/tools/" + seed.a3.tools.tuinaanleg + "/bouwer";
const prijzen = (s) => s.page.evaluate(() => [...document.querySelectorAll("input")].filter(e => e.type === "text").map(e => e.value).filter(v => /^-?\d|^$|abc/.test(v)).slice(0, 8));
const meld = (s) => s.page.evaluate(() => [...document.querySelectorAll("body *")].filter(e => e.children.length === 0 && /opgeslagen|prijs|Vul|fout|ongeldig|Opslaan/i.test(e.textContent) && e.textContent.length < 120).map(e => e.textContent.trim()).slice(0, 6));
(async () => {
  const s = await k.open({ agent: "edge-case-tester-1", gebruiker: "a3", viewport: "desktop", pad: url, maxStappen: 250 });
  await s.page.waitForTimeout(800);
  const open = async () => { const b = s.page.getByRole("button", { name: /^Schutting/ }).first(); if (await b.count()) { await b.click(); await s.page.waitForTimeout(900); } };
  const zet = async (w) => {
    await open();
    const i = await s.page.evaluate(() => [...document.querySelectorAll("input")].findIndex(e => e.type === "text" && /^(85|135|110)$/.test(e.value)));
    const v = s.page.locator("input").nth(i);
    await v.fill(w); await v.press("Tab");
    await s.page.waitForTimeout(2500);
    console.log(`INVOER ${JSON.stringify(w)} -> veld ${JSON.stringify(await v.inputValue())}; meldingen ${JSON.stringify(await meld(s))}`);
    await s.scherm("prijs-" + (w || "leeg").replace(/[^a-z0-9]/gi, "x"));
    await s.page.reload({ waitUntil: "networkidle" }); await s.page.waitForTimeout(1000);
    await open();
    console.log("   na reload prijzen:", JSON.stringify(await prijzen(s)));
  };
  await zet("-10");
  await zet("1000000000");
  await zet("12,50");
  await zet("abc");
  console.log("CONSOLE", s.consoleFouten.slice(-4), "NET", s.netwerkFouten.slice(-3));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message.slice(0, 400)); process.exit(1); });
