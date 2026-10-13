const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.getByText("nog invullen").click();
  await s.page.waitForTimeout(500);
  await s.page.getByLabel("Uitvoeringsdatum", { exact: true }).fill("2026-10-13");
  await s.page.waitForTimeout(1200);
  await s.page.getByText("Grondwerk en afvoer").first().click();
  await s.page.waitForTimeout(700);
  await s.scherm("stelpost-editor");
  const side = await s.page.locator("body").innerText();
  console.log(side.slice(side.indexOf("Alles opgeslagen")), "");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
