const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(500);
  await s.scherm("na-datum-reload");
  const side = await s.page.locator("body").innerText();
  console.log(side.slice(side.indexOf("Voor je definitief"), side.indexOf("Voor je definitief")+300));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
