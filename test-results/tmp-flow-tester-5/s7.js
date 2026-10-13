const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-5", gebruiker: "a1", viewport: "desktop", pad: "/dashboard/leads", maxStappen: 250 });
  await s.page.getByText("Ahmed Akkoord").first().click();
  await s.page.waitForTimeout(800);
  const t = await s.page.locator("body").innerText();
  const i = t.indexOf("Ahmed Akkoord\n\nTuinaanleg ·");
  console.log(t.slice(i, i+1800));
  await s.scherm("lead-drawer-na-concept");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
