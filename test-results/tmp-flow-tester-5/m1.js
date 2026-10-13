const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "mobiel", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(500);
  const sw = await s.page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
  console.log("OVERFLOW", sw);
  await s.scherm("mobiel-eindfactuur");
  const t = await s.page.locator("body").innerText();
  console.log(t.slice(0, 400).replace(/\n/g, " | "));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
