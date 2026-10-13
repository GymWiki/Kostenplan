const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/leads", maxStappen: 250 });
  await s.page.getByText("Ahmed Akkoord").first().click();
  await s.page.waitForTimeout(800);
  await s.page.getByRole("button", { name: "Factuur maken" }).first().click();
  await s.page.waitForTimeout(500);
  await s.page.getByText("Termijnfacturen volgens de offerte").click();
  await s.page.waitForTimeout(1000);
  await s.scherm("termijn-keuze");
  const dialog = s.page.getByRole("dialog");
  const txt = (await dialog.count()) ? await dialog.first().innerText() : await s.page.locator("body").innerText();
  console.log(txt.slice(-3000));
  console.log("URL", s.page.url());
  console.log("ERR", s.consoleFouten);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
