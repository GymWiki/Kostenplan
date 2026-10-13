const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wx3eo007a7b7d4fv544bu", maxStappen: 250 });
  await s.page.waitForTimeout(400);
  const b = s.page.getByRole("button", { name: /Definitief maken/ }).first();
  console.log("disabled:", await b.isDisabled());
  await b.click();
  await s.page.waitForTimeout(800);
  await s.scherm("definitief-blokkade-klik");
  const t = await s.page.locator("body").innerText();
  console.log(t.includes("Na definitief maken") ? "DIALOOG OPEN" : "geen dialoog");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
