const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(400);
  await s.page.getByText("Stelpost", { exact: true }).first().click();
  await s.page.waitForTimeout(700);
  await s.scherm("stelpost-badge-klik");
  const t = await s.page.locator("body").innerText();
  const i = t.indexOf("Regel\nSluiten");
  console.log(i >= 0 ? t.slice(i, i + 300) : t.slice(t.indexOf("Voor je definitief"), t.indexOf("Voor je definitief") + 300));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
