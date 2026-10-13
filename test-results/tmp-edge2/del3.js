const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 80 });
  const p = s.page;
  for (let i = 0; i < 9; i++) {
    const n = await p.getByLabel("Titel van de sectie").count();
    if (n <= 1) break;
    s.stap(); await p.locator("tr.og-sectiekop").nth(1).locator("td").last().click(); await p.waitForTimeout(500);
    s.stap(); await p.getByRole("button", { name: "Sectie verwijderen" }).click().catch(e=>console.log("fout",e.message.slice(0,100)));
    await p.waitForTimeout(700);
    const dlg = await p.locator('[role=alertdialog],[role=dialog]').count();
    if (dlg) { console.log("bevestiging:", (await p.locator('[role=alertdialog],[role=dialog]').allInnerTexts()).join(' ').slice(0,200)); s.stap(); await p.locator('[role=alertdialog] button, [role=dialog] button').last().click(); await p.waitForTimeout(700); }
    console.log("secties nu:", await p.getByLabel("Titel van de sectie").count());
  }
  s.stap(); await p.reload({ waitUntil: "networkidle" });
  console.log("Totaal na reload:", (await p.locator("body").innerText()).match(/Totaal incl\. btw\s*\n?(€[^\n]*)/)?.[1], "secties", await p.getByLabel("Titel van de sectie").count());
  await s.scherm("opgeruimd");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
