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
const sectie = async (naam, fn) => { try { await fn(); } catch (e) { uit[naam] = { fout: e.message.split("\n").slice(0, 4).join(" | ").slice(0, 400) }; console.log("FOUT", naam, uit[naam].fout); } };
(async () => {
  const s = await k.open({ agent: "perf-tester-1", gebruiker: "a1", viewport: "mobiel", pad: "/dashboard/leads", maxStappen: 150 });
  const p = s.page;
  const zichtbaar = (re) => p.locator("button:visible").filter({ hasText: re }).first();
  const alle = () => p.locator("button:visible").filter({ hasText: /^Alle\b/ }).first();
  const esc = async () => { stap(); await p.keyboard.press("Escape"); await p.waitForTimeout(300); };

  await sectie("chips", async () => {
    const m = [];
    for (let i = 0; i < 5; i++) {
      const chip = i % 2 === 0 ? zichtbaar(/^Akkoord/) : alle();
      m.push(await meet(p, () => chip.click()));
      await p.waitForTimeout(300);
    }
    uit.chips = { "Chip filteren Leads (Akkoord/Alle alterneren)": stats(m) };
  });

  await sectie("zet_in_contact", async () => {
    const m = [];
    for (const naam of ["Nina Nieuw", "Bob Buiten"]) {
      await p.goto(k.BASE + "/dashboard/leads", { waitUntil: "networkidle" }); stap();
      await alle().click(); stap(); await p.waitForTimeout(300);
      await p.getByRole("button", { name: new RegExp("^" + naam) }).first().click(); stap();
      await p.getByRole("dialog").waitFor({ timeout: 5000 });
      const knop = p.getByRole("button", { name: /Zet op In contact/ }).first();
      try { m.push(await meet(p, () => knop.click({ timeout: 4000 }))); }
      catch (e) { uit.zet_fout = (uit.zet_fout || "") + ` [${naam}] ` + e.message.split("\n").slice(0, 5).join(" | ").slice(0, 300); m.push(null); }
      await p.waitForTimeout(400); await esc();
    }
    uit.zet_in_contact = { "Zet op In contact (n=2: enige leads in fase Nieuw)": stats(m) };
  });

  await sectie("zichtbaar", async () => {
    await p.goto(k.BASE + `/dashboard/tools/${seed.tools.tuinaanleg}/calculator`, { waitUntil: "networkidle" }); stap();
    const sw = p.getByRole("switch", { name: /Zichtbaar voor klanten: Schutting/ }).first();
    await sw.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
    const m = [];
    for (let i = 0; i < 5; i++) {
      try { m.push(await meet(p, () => sw.click({ timeout: 4000 }))); }
      catch (e) { uit.zichtbaar_fout = e.message.split("\n").slice(0, 6).join(" | ").slice(0, 500); m.push(null); break; }
      await p.waitForTimeout(500);
    }
    if (m.length === 5) { stap(); await sw.click({ timeout: 4000 }); }
    uit.zichtbaar = { "Zichtbaar-schakelaar rekentool (Schutting)": stats(m), aria_checked_eind: await sw.getAttribute("aria-checked").catch(() => null) };
  });

  await sectie("betaling_actie", async () => {
    const res = [];
    for (const id of [seed.facturen.verstuurd, seed.facturen["te-laat"]]) {
      await p.goto(k.BASE + `/dashboard/facturen/${id}`, { waitUntil: "networkidle" }); stap();
      await p.getByRole("button", { name: "Betaling registreren" }).first().click(); stap();
      await p.getByRole("dialog").waitFor({ timeout: 5000 });
      const submit = p.getByRole("dialog").getByRole("button", { name: "Betaling opslaan" });
      const t0 = Date.now();
      const bezig = await meet(p, () => submit.click({ timeout: 4000 })); stap();
      await p.getByRole("dialog").waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
      res.push({ factuur: id, eerste_dom_wijziging_ms: bezig == null ? null : Math.round(bezig), dialog_dicht_na_ms: Date.now() - t0, status_na: (await p.locator("body").innerText()).match(/Betaald|Openstaand|Gedeeltelijk/)?.[0] ?? null });
    }
    uit.betaling_actie = res;
  });

  await sectie("opslaan_editor", async () => {
    await p.goto(k.BASE + `/dashboard/leads/${seed.leads["offerte-concept"]}/offerte`, { waitUntil: "networkidle" }); stap();
    await p.getByRole("button", { name: /Onderwerp en teksten/ }).first().click(); stap();
    await p.getByRole("dialog").waitFor({ timeout: 5000 });
    const veld = p.getByRole("dialog").getByRole("textbox").first();
    const tijden = [];
    for (let i = 0; i < 3; i++) {
      await p.evaluate(() => {
        window.__ed = { t0: null, bezig: null, klaar: null };
        const start = () => {
          window.__ed.t0 = performance.now();
          const o = new MutationObserver(() => {
            const t = document.body.innerText;
            if (window.__ed.bezig === null && /Opslaan…|Opslaan\.\.\./.test(t)) window.__ed.bezig = performance.now() - window.__ed.t0;
            if (window.__ed.bezig !== null && t.includes("Alles opgeslagen")) { window.__ed.klaar = performance.now() - window.__ed.t0; o.disconnect(); }
          });
          o.observe(document.body, { subtree: true, childList: true, characterData: true });
        };
        document.addEventListener("keydown", start, { capture: true, once: true });
      });
      stap(); await veld.click(); stap(); await veld.press("End"); stap(); await veld.pressSequentially(String(i), { delay: 40 });
      await p.waitForFunction(() => window.__ed.klaar !== null, null, { timeout: 15000 }).catch(() => {});
      tijden.push(await p.evaluate(() => ({ opslaan_tot_ms: window.__ed.bezig && Math.round(window.__ed.bezig), alles_opgeslagen_tot_ms: window.__ed.klaar && Math.round(window.__ed.klaar) })));
    }
    uit.opslaan_editor = { "Offerte-editor (tekst): invoer tot 'Opslaan…' en 'Alles opgeslagen'": tijden };
  });

  fs.writeFileSync("/home/user/Kostenplan/test-results/perf-tester-1-react2.json", JSON.stringify(uit, null, 1));
  console.log(JSON.stringify(uit, null, 1));
  console.log("acties (script):", acties);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.slice(0, 400)); process.exit(1); });
