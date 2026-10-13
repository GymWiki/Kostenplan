const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-6", gebruiker: "a2", viewport: "mobiel", pad: "/dashboard/profiel/werkgebied" });
  await s.scherm("werkgebied-start");
  const tekst = await s.page.locator("main").innerText().catch(() => s.page.innerText("body"));
  console.log(tekst.slice(0, 2500));
  console.log("FOUTEN", s.consoleFouten, s.netwerkFouten);
  await s.sluit();
})().catch(e => { console.error("SCRIPTFOUT", e.message); process.exit(1); });
