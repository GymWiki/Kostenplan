const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(400);
  await s.page.getByText("Sluiten", { exact: true }).first().click().catch(()=>{});
  await s.page.waitForTimeout(800);
  await s.scherm("na-sluiten");
  const side = await s.page.locator("body").innerText();
  const i = side.indexOf("Voor je definitief");
  console.log(i >= 0 ? side.slice(i, i + 300) : "(geen blokkade-tekst)");
  console.log((await s.page.getByRole("button", { name: /Definitief maken/ }).allInnerTexts()));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
