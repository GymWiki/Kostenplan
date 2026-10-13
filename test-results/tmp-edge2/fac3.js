const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: "/dashboard/facturen", maxStappen: 40 });
  const p = s.page;
  console.log((await p.locator("main").innerText().catch(()=>p.locator("body").innerText())).replace(/\n+/g,' | ').slice(0,1800));
  await s.scherm("facturen-lijst-voor");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
