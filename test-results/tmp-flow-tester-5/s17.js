const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(500);
  const t = await s.page.locator("body").innerText();
  const j = t.indexOf("Totaal incl. btw");
  console.log(t.slice(j, j + 1500));
  console.log("ERR", s.consoleFouten.length);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
