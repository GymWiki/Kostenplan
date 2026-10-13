const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen", maxStappen: 250 });
  await s.scherm("facturen-lijst");
  console.log((await s.page.locator("main").innerText().catch(()=>s.page.locator("body").innerText())).slice(0, 5000));
  console.log("URL", s.page.url());
  console.log("ERR", s.consoleFouten);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
