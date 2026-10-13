const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(400);
  await s.page.getByText("Stelpost", { exact: true }).first().click();
  await s.page.waitForTimeout(700);
  await s.page.getByLabel("Soort regel").selectOption("normaal");
  await s.page.waitForTimeout(1200);
  await s.page.getByText("Sluiten", { exact: true }).first().click().catch(()=>{});
  await s.page.waitForTimeout(800);
  await s.page.reload({ waitUntil: "networkidle" });
  await s.page.waitForTimeout(400);
  await s.scherm("soort-normaal-na-reload");
  const t = await s.page.locator("body").innerText();
  const i = t.indexOf("Voor je definitief");
  console.log(i >= 0 ? t.slice(i, i + 300) : "(geen blokkade)");
  console.log(await s.page.getByRole("button", { name: /Definitief maken/ }).allInnerTexts());
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
