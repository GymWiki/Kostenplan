const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wukg3006g7b7dob4sn2wx", maxStappen: 250 });
  await s.page.getByRole("button", { name: "Betaling registreren" }).click();
  await s.page.waitForTimeout(600);
  const d = s.page.getByRole("dialog");
  await d.getByRole("textbox").first().fill("500,00");
  await d.getByRole("button", { name: "Betaling opslaan" }).click();
  await s.page.waitForTimeout(1200);
  await s.page.reload({ waitUntil: "networkidle" });
  await s.page.waitForTimeout(400);
  await s.scherm("na-deelbetaling");
  const t = await s.page.locator("body").innerText();
  console.log(t.slice(0, 700));
  console.log("ERR", s.consoleFouten.length);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
