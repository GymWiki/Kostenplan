const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-7", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/profiel", maxStappen: 60 });
  const p = s.page;
  const trigger = p.getByRole("button", { name: /Hoveniersbedrijf De Vries/ }).first();
  console.log("trigger count", await p.getByRole("button", { name: /Hoveniersbedrijf De Vries/ }).count());
  s.stap(); await trigger.click();
  await p.waitForTimeout(600);
  await s.scherm("wisselaar-open");
  const dialoog = await p.locator('[role="dialog"], [role="menu"], [role="listbox"]').first().innerText().catch(() => "GEEN DIALOOG");
  console.log("DIALOOG:", dialoog);
  console.log("buttons:", await p.locator("button:visible").allInnerTexts());
  console.log("consoleFouten", s.consoleFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
