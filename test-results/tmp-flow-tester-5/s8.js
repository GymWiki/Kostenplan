const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wukg3006g7b7dob4sn2wx", maxStappen: 250 });
  await s.page.getByRole("button", { name: "Definitief maken" }).click();
  await s.page.waitForTimeout(1200);
  await s.scherm("definitief-klik-1");
  const t = await s.page.locator("body").innerText();
  console.log(t.slice(0, 1500));
  console.log("...");
  console.log(t.slice(-2500));
  console.log("URL", s.page.url(), "ERR", s.consoleFouten);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
