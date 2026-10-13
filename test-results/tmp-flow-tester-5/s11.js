const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wukg3006g7b7dob4sn2wx", maxStappen: 250 });
  await s.page.getByRole("button", { name: "Versturen", exact: true }).click();
  await s.page.waitForTimeout(800);
  await s.scherm("versturen-dialoog");
  await s.page.getByRole("button", { name: "Ja, verstuurd" }).click();
  await s.page.waitForTimeout(1000);
  await s.page.reload({ waitUntil: "networkidle" });
  await s.page.waitForTimeout(500);
  await s.scherm("na-verstuurd");
  const t = await s.page.locator("body").innerText();
  console.log(t.slice(0, 1200));
  console.log("ERR", s.consoleFouten);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
