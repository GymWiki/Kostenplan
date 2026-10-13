const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const FID = process.env.FID;
const URL = `/dashboard/facturen/${FID}`;
(async () => {
  const a = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const b = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  for (const [nm, s] of [["A", a], ["B", b]]) {
    s.stap(); await s.page.getByRole("button", { name: "Betaling registreren" }).click(); await s.page.waitForTimeout(800);
    console.log(nm, "dialoog:", (await s.page.locator('[role=dialog]').allInnerTexts()).map(x=>x.replace(/\n+/g,' / ').slice(0,400)));
    console.log(nm, "inputs:", await s.page.evaluate(()=>[...document.querySelectorAll('[role=dialog] input, [role=dialog] select')].map(i=>(i.name||i.getAttribute('aria-label')||i.type)+'='+i.value)));
  }
  await a.scherm("betaal-dialoog-A"); await b.scherm("betaal-dialoog-B");
  await a.sluit(); await b.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
