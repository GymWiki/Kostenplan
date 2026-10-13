const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(400);
  await s.page.getByText("Te bepalen", { exact: true }).first().click();
  await s.page.waitForTimeout(700);
  const side = await s.page.locator("body").innerText();
  const i = side.indexOf("Regel\nSluiten");
  console.log(side.slice(i, i + 1400));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
