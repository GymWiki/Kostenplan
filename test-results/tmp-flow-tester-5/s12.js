const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/facturen/cmv6wukg3006g7b7dob4sn2wx", maxStappen: 250 });
  await s.page.getByRole("button", { name: "Betaling registreren" }).click();
  await s.page.waitForTimeout(800);
  await s.scherm("betaling-dialoog-deel");
  const d = s.page.getByRole("dialog");
  console.log("DIALOG:", (await d.count()) ? (await d.first().innerText()) : "(geen dialog)");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
