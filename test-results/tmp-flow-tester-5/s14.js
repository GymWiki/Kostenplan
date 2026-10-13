const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/leads", maxStappen: 250 });
  await s.page.getByText("Ahmed Akkoord").first().click();
  await s.page.waitForTimeout(800);
  const t0 = await s.page.locator("body").innerText();
  const i = t0.indexOf("Ahmed Akkoord\n\nTuinaanleg ·");
  console.log(t0.slice(i, i+400));
  await s.page.getByRole("button", { name: "Factuur maken" }).first().click();
  await s.page.waitForTimeout(500);
  await s.scherm("factuur-maken-opties-2");
  const d = s.page.getByRole("dialog");
  console.log("DIALOG:", (await d.count()) ? (await d.first().innerText()) : "(geen dialog)");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
