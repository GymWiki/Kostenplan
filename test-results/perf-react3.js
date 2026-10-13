const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json").a1;
const fs = require("fs");
const uit = {};
let acties = 0; const stap = () => acties++;
const stats = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); if (!s.length) return null; const m = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; return { n: s.length, mediaan: Math.round(m), slechtste: Math.round(s[s.length - 1]), waarden: xs.map((x) => (x == null ? null : Math.round(x))) }; };
async function meet(page, klik) {
  await page.evaluate(() => {
    window.__r = null;
    window.addEventListener("pointerdown", () => {
      window.__t0 = performance.now();
      const o = new MutationObserver(() => { window.__r = performance.now() - window.__t0; o.disconnect(); });
      o.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    }, { capture: true, once: true });
  });
  stap(); await klik();
  await page.waitForFunction(() => window.__r !== null, null, { timeout: 5000 }).catch(() => {});
  return page.evaluate(() => window.__r);
}
const sectie = async (naam, fn) => { try { await fn(); } catch (e) { uit[naam + "_fout"] = e.message.split("\n").slice(0, 3).join(" | ").replace(/\u001b\[\d+m/g, "").slice(0, 300); console.log("FOUT", naam, uit[naam + "_fout"]); } };
(async () => {
  const s = await k.open({ agent: "perf-tester-1", gebruiker: "a1", viewport: "mobiel", pad: "/dashboard/leads", maxStappen: 150 });
  const p = s.page;
  const esc = async () => { stap(); await p.keyboard.press("Escape"); await p.waitForTimeout(300); };
  const chipTeksten = () => p.locator("button:visible").allInnerTexts().then((t) => t.map((x) => x.replace(/\s+/g, " ").trim()).filter((x) => /^(Alle|Akkoord|Nieuw|Offerte|Open|Afgerond)/.test(x)));
  console.log("chips zichtbaar:", JSON.stringify(await chipTeksten()));

  await sectie("chips", async () => {
    const m = []; const log = [];
    for (let i = 0; i < 5; i++) {
      const re = i % 2 === 0 ? /^Akkoord/ : /^Alle/;
      const chip = p.locator("button:visible").filter({ hasText: re }).first();
      log.push(await chip.count());
      m.push(await meet(p, () => chip.click({ timeout: 4000 })));
      await p.waitForTimeout(300);
    }
    uit.chips = { "Chip filteren Leads (Akkoord/Alle alterneren)": stats(m), aantallen_gevonden: log, zichtbaar_na: await chipTeksten() };
  });

  await sectie("zet_in_contact", async () => {
    const m = [];
    for (const naam of ["Nina Nieuw", "Bob Buiten"]) {
      await p.goto(k.BASE + "/dashboard/leads", { waitUntil: "networkidle" }); stap();
      await p.locator("button:visible").filter({ hasText: /^Alle/ }).first().click({ timeout: 4000 }); stap(); await p.waitForTimeout(300);
      await p.getByRole("button", { name: new RegExp("^" + naam) }).first().click({ timeout: 4000 }); stap();
      await p.getByRole("dialog").waitFor({ timeout: 5000 });
      const knop = p.getByRole("button", { name: /Zet op In contact/ }).first();
      try { m.push(await meet(p, () => knop.click({ timeout: 4000 }))); }
      catch (e) { uit.zet_fout = (uit.zet_fout || "") + ` [${naam}] ` + e.message.split("\n").slice(0, 3).join(" | ").replace(/\u001b\[\d+m/g, "").slice(0, 250); m.push(null); }
      await p.waitForTimeout(400); await esc();
    }
    uit.zet_in_contact = { "Zet op In contact (n=2: enige leads in fase Nieuw)": stats(m) };
  });

  await sectie("zichtbaar", async () => {
    await p.goto(k.BASE + `/dashboard/tools/${seed.tools.tuinaanleg}/calculator`, { waitUntil: "networkidle" }); stap();
    await p.locator("button:visible").filter({ hasText: /^Schutting/ }).first().click({ timeout: 4000 }); stap();
    await p.waitForTimeout(400);
    const sw = p.getByRole("switch", { name: /Zichtbaar voor klanten: Schutting/ }).first();
    const m = [];
    for (let i = 0; i < 5; i++) {
      m.push(await meet(p, () => sw.click({ timeout: 4000 }))); stap();
      await p.waitForTimeout(500);
    }
    stap(); await sw.click({ timeout: 4000 }); await p.waitForTimeout(300);
    uit.zichtbaar = { "Zichtbaar-schakelaar rekentool (Schutting, 5 wisselingen + 1 herstel)": stats(m), aria_checked_eind: await sw.getAttribute("aria-checked").catch(() => null) };
  });

  fs.writeFileSync("/home/user/Kostenplan/test-results/perf-tester-1-react3.json", JSON.stringify(uit, null, 1));
  console.log(JSON.stringify(uit, null, 1));
  console.log("acties (script):", acties);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.slice(0, 400)); process.exit(1); });
