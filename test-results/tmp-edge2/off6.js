const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 80 });
  const p = s.page;
  const tr = p.locator("tr.og-wijzigbaar").nth(1);
  const cells = tr.locator("td");
  console.log("cellen", await cells.count());
  s.stap(); await cells.nth(3).click();
  await p.waitForTimeout(700);
  console.log("na klik prijscel: active=", await p.evaluate(()=>document.activeElement.tagName+" "+(document.activeElement.getAttribute('aria-label')||'')+" "+document.activeElement.className));
  console.log("popups:", await p.locator('[role=dialog],[role=menu],[role=listbox],[data-radix-popper-content-wrapper]').count());
  console.log("nieuwe inputs:", await p.locator("input").count());
  await s.scherm("prijscel-klik");
  // klik op rij-knop
  const btns = await tr.locator("button").evaluateAll(b=>b.map(x=>(x.getAttribute('aria-label')||x.innerText||'')));
  console.log("rij-knoppen", btns);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
