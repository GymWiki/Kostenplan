const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/leads", maxStappen: 250 });
  await s.page.getByText("Ahmed Akkoord").first().click();
  await s.page.waitForTimeout(800);
  await s.page.getByRole("button", { name: "Factuur maken" }).first().click();
  await s.page.waitForTimeout(500);
  await s.page.getByRole("button", { name: "Eindfactuur (trekt de termijnen af)" }).click();
  await s.page.waitForTimeout(1500);
  await s.scherm("eindfactuur-concept");
  console.log("URL", s.page.url());
  const t = await s.page.locator("body").innerText();
  console.log(t.slice(0, 1200));
  console.log("...");
  const j = t.indexOf("Berekening");
  console.log(t.slice(j - 1200, j + 900));
  console.log("ERR", s.consoleFouten);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
