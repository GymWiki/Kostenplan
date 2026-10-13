const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(400);
  await s.page.getByText("Te bepalen", { exact: true }).first().click();
  await s.page.waitForTimeout(700);
  // eerst het aantal expliciet op 1 zetten en kijken of de blokkade verdwijnt
  const aantal = s.page.getByLabel("Aantal", { exact: true }).first();
  await aantal.fill("1");
  await aantal.press("Tab");
  await s.page.waitForTimeout(1000);
  const side = await s.page.locator("body").innerText();
  const i = side.indexOf("Voor je definitief");
  console.log("NA AANTAL:", i >= 0 ? side.slice(i, i + 200) : "(geen blokkade-tekst)");
  await s.scherm("stelpost-aantal-1");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
