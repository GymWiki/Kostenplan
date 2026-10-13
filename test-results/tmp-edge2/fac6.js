const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/facturen/cmv6xym7700740s7d8h2wzb3g";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  s.stap(); await p.getByRole("button", { name: "Definitief maken" }).click();
  await p.waitForTimeout(2000);
  const t = await p.locator("body").innerText();
  console.log("concept nog:", /Concept – nog geen nummer/.test(t), "| url:", p.url());
  console.log("dialog:", (await p.locator('[role=dialog],[role=alertdialog]').allInnerTexts()).map(x=>x.replace(/\n+/g,' / ').slice(0,700)));
  console.log("Knoppen nu:", await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean).slice(-10)));
  await s.scherm("definitief-enkel-klik");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
