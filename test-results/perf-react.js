const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json").a1;
const fs = require("fs");
const uit = {};
let acties = 0;
const stap = () => { acties++; };
const stats = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); if (!s.length) return null; const m = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; return { n: s.length, mediaan: Math.round(m), slechtste: Math.round(s[s.length - 1]), waarden: xs.map((x) => (x == null ? null : Math.round(x))) }; };
// Meet klik -> eerste DOM-wijziging. t0 wordt gezet op pointerdown (de echte klik van Playwright), resolve bij eerste mutatie.
async function meet(page, naam, klik) {
  await page.evaluate(() => {
    window.__r = null;
    window.addEventListener("pointerdown", () => {
      window.__t0 = performance.now();
      const o = new MutationObserver(() => { window.__r = performance.now() - window.__t0; o.disconnect(); });
      o.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    }, { capture: true, once: true });
  });
  stap();
  await klik();
  await page.waitForFunction(() => window.__r !== null, null, { timeout: 5000 }).catch(() => {});
  return page.evaluate(() => window.__r);
}
const sectie = async (naam, fn) => { try { await fn(); } catch (e) { uit[naam] = { fout: e.message.split("\n")[0].slice(0, 200) }; console.log("FOUT", naam, uit[naam].fout); } };
(async () => {
  const s = await k.open({ agent: "perf-tester-1", gebruiker: "a1", viewport: "mobiel", pad: "/dashboard", maxStappen: 150 });
  const p = s.page;
  const esc = async () => { stap(); await p.keyboard.press("Escape"); await p.waitForTimeout(250); };
  const hoofd = (naam) => p.locator("nav", { has: p.locator("a") }).last().getByRole("link", { name: naam, exact: false }).first();

  await sectie("menu_tabs", async () => {
    const m = [];
    for (let i = 0; i < 5; i++) {
      m.push(await meet(p, "Rekentools", () => hoofd("Rekentools").click()));
      await p.waitForURL(/rekentools|tools/, { timeout: 8000 }).catch(() => {});
      m.push(await meet(p, "Overzicht", () => hoofd("Overzicht").click()));
      await p.waitForURL((u) => u.pathname === "/dashboard", { timeout: 8000 }).catch(() => {});
    }
    uit.menu_tabs = { "Rekentools / Overzicht (alterneren)": stats(m.filter((_, i) => true)) };
  });

  await sectie("lead_open", async () => {
    await p.goto(k.BASE + "/dashboard/leads", { waitUntil: "networkidle" }); stap();
    const m = [];
    for (let i = 0; i < 5; i++) {
      const lead = p.getByRole("button", { name: /^Nina Nieuw/ }).first();
      m.push(await meet(p, "lead", () => lead.click()));
      await p.getByRole("dialog").waitFor({ timeout: 5000 });
      await esc();
      await p.getByRole("dialog").waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
    }
    uit.lead_open = { "Lead openen (drawer, Nina Nieuw)": stats(m) };
  });

  await sectie("chips", async () => {
    await p.goto(k.BASE + "/dashboard/leads", { waitUntil: "networkidle" }); stap();
    const m = [];
    for (let i = 0; i < 5; i++) {
      const chip = i % 2 === 0 ? p.locator("button").filter({ hasText: /^Akkoord/ }).first() : p.locator("button").filter({ hasText: /^Alle\b/ }).first();
      m.push(await meet(p, "chip", () => chip.click()));
      await p.waitForTimeout(300);
    }
    uit.chips = { "Chips filteren (Akkoord/Alle alterneren)": stats(m) };
    await p.locator("button").filter({ hasText: /^Alle\b/ }).first().click(); stap();
  });

  await sectie("zet_in_contact", async () => {
    const m = [];
    for (const naam of ["Nina Nieuw", "Bob Buiten"]) {
      await p.goto(k.BASE + "/dashboard/leads", { waitUntil: "networkidle" }); stap();
      await p.getByRole("button", { name: new RegExp("^" + naam) }).first().click(); stap();
      await p.getByRole("dialog").waitFor({ timeout: 5000 });
      const knop = p.getByRole("button", { name: /Zet op In contact/ }).first();
      if (!(await knop.count())) { m.push(null); await esc(); continue; }
      m.push(await meet(p, "zet", () => knop.click()));
      await p.waitForTimeout(400);
      await esc();
    }
    uit.zet_in_contact = { "Zet op In contact (n=2, alleen 2 leads in fase Nieuw)": stats(m) };
  });

  await sectie("zichtbaar", async () => {
    await p.goto(k.BASE + `/dashboard/tools/${seed.tools.tuinaanleg}/calculator`, { waitUntil: "networkidle" }); stap();
    const sw = p.getByRole("switch", { name: /Zichtbaar voor klanten: Schutting/ }).first();
    const m = [];
    for (let i = 0; i < 5; i++) { m.push(await meet(p, "zichtbaar", () => sw.click())); await p.waitForTimeout(500); }
    stap(); await sw.click(); // herstel de oorspronkelijke stand (oneven aantal klikken)
    uit.zichtbaar = { "Zichtbaar-schakelaar rekentool (Schutting)": stats(m), eind_aria_checked: await sw.getAttribute("aria-checked") };
  });

  await sectie("betaling_openen", async () => {
    const m = [];
    for (const id of [seed.facturen.verstuurd]) {
      await p.goto(k.BASE + `/dashboard/facturen/${id}`, { waitUntil: "networkidle" }); stap();
      for (let i = 0; i < 5; i++) {
        const knop = p.getByRole("button", { name: "Betaling registreren" }).first();
        m.push(await meet(p, "betaling", () => knop.click()));
        await p.getByRole("dialog").waitFor({ timeout: 5000 });
        await esc();
        await p.getByRole("dialog").waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
      }
    }
    uit.betaling_openen = { "Betaling registreren openen (sheet)": stats(m) };
  });

  await sectie("versturen_openen", async () => {
    await p.goto(k.BASE + `/dashboard/leads/${seed.leads["offerte-concept"]}/offerte`, { waitUntil: "networkidle" }); stap();
    const m = [];
    for (let i = 0; i < 5; i++) {
      const knop = p.getByRole("button", { name: "Versturen", exact: true }).first();
      m.push(await meet(p, "versturen", () => knop.click()));
      await p.waitForTimeout(300);
      await esc();
      await p.waitForTimeout(300);
    }
    uit.versturen_openen = { "Versturen openen (offerte)": stats(m) };
  });

  await sectie("opslaan_editor", async () => {
    await p.goto(k.BASE + `/dashboard/leads/${seed.leads["offerte-concept"]}/offerte`, { waitUntil: "networkidle" }); stap();
    stap(); await p.getByRole("button", { name: /Onderwerp en teksten/ }).first().click();
    await p.getByRole("dialog").waitFor({ timeout: 5000 }).catch(() => {});
    const veld = p.getByRole("dialog").getByRole("textbox").first();
    const tijden = [];
    for (let i = 0; i < 3; i++) {
      const t0 = await p.evaluate(() => performance.now());
      const eind = await p.evaluate(() => new Promise((res) => {
        const start = performance.now();
        const kijk = () => { if (document.body.innerText.includes("Alles opgeslagen")) { res({ tot_alles: performance.now() - start }); return; } if (performance.now() - start > 15000) { res({ tot_alles: null }); return; } setTimeout(kijk, 25); };
        kijk();
      }));
      const tekst = `Aanleg tuin ${i} `;
      stap();
      const t1 = Date.now();
      await veld.click(); await veld.press("End"); await veld.pressSequentially(String(i), { delay: 30 }); stap();
      const v = await p.evaluate(() => new Promise((res) => {
        const start = performance.now();
        let opslaan = null;
        const o = new MutationObserver(() => {
          const t = document.body.innerText;
          if (opslaan === null && /Opslaan…|Opslaan\.\.\./.test(t)) opslaan = performance.now() - start;
          if (t.includes("Alles opgeslagen")) { o.disconnect(); res({ opslaan_tot_ms: opslaan, alles_opgeslagen_tot_ms: performance.now() - start }); }
        });
        o.observe(document.body, { subtree: true, childList: true, characterData: true });
        setTimeout(() => { o.disconnect(); res({ opslaan_tot_ms: opslaan, alles_opgeslagen_tot_ms: null }); }, 15000);
      }));
      tijden.push(v);
    }
    uit.opslaan_editor = { "Editor (offerte-tekst): tijd tot 'Alles opgeslagen' na invoer": tijden };
  });

  fs.writeFileSync("/home/user/Kostenplan/test-results/perf-tester-1-react.json", JSON.stringify(uit, null, 2));
  console.log(JSON.stringify(uit, null, 1));
  console.log("acties (ruwe telling in script):", acties);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.slice(0, 400)); process.exit(1); });
