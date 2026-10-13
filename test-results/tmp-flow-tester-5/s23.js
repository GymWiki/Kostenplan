const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(500);
  await s.page.locator('input[value="Grondwerk en afvoer"]').first().click();
  await s.page.waitForTimeout(700);
  await s.scherm("stelpost-klik");
  const side = await s.page.locator("body").innerText();
  const i = side.indexOf("Voor je definitief");
  console.log(side.slice(i - 400, i + 800));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
