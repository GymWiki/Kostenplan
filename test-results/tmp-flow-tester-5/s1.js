const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/leads", maxStappen: 250 });
  await s.scherm("leads-overzicht");
  console.log((await s.page.locator("body").innerText()).slice(0, 3000));
  console.log("URL", s.page.url());
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
