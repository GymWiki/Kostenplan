const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(500);
  const t = await s.page.locator("body").innerText();
  const j = t.indexOf("Berekening");
  console.log("REEDS:", t.match(/.*[Rr]eeds.*/g));
  console.log(t.slice(j, j + 700));
  const f = await s.scherm("eindfactuur-concept-volledig");
  await s.page.evaluate(() => window.scrollTo(0, 500));
  await s.page.waitForTimeout(300);
  await s.scherm("eindfactuur-concept-scroll");
  console.log("ERR", s.consoleFouten.length);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
