const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 80 });
  const p = s.page;
  s.stap(); await p.getByRole("button", { name: "Sectie toevoegen" }).click(); await p.waitForTimeout(800);
  const titel = p.getByLabel("Titel van de sectie").last();
  console.log("titel-waarde:", JSON.stringify(await titel.inputValue()));
  const html = await p.evaluate(()=>{ const t=[...document.querySelectorAll('input[aria-label="Titel van de sectie"]')].pop(); let r=t; for(let i=0;i<5;i++) r=r.parentElement; return r.outerHTML.replace(/class="[^"]*"/g,'').slice(0,3000); });
  console.log(html);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
