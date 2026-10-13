const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-3", gebruiker: "a2", viewport: "desktop", pad: "/dashboard/leads", maxStappen: 40 });
  await s.page.waitForTimeout(2500);
  await s.scherm("leads-overzicht");
  const t = await s.page.locator("body").innerText();
  console.log("TEKST", t.slice(0, 3000).replace(/\n+/g, " | "));
  console.log("FOUTEN", s.consoleFouten, s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.slice(0, 400)); process.exit(1); });
