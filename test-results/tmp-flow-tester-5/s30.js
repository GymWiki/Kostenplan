const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(400);
  console.log("AANTAL-labels:", await s.page.getByLabel("Aantal", { exact: true }).count());
  const vals = await s.page.locator("input").evaluateAll(els => els.map(e => e.getAttribute("aria-label") + "|" + e.name + "|" + e.value).filter(x => /Aantal|^null\|/.test(x)).slice(0, 20));
  console.log(vals);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
