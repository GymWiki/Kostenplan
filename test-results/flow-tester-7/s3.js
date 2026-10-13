const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-7", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/profiel", maxStappen: 60 });
  const p = s.page;
  // Wissel naar Groenstijl Tuinen
  await p.getByRole("button", { name: /Hoveniersbedrijf De Vries/ }).first().click();
  await p.waitForTimeout(500);
  s.stap(); await p.getByRole("button", { name: /Groenstijl Tuinen/ }).last().click();
  await p.waitForURL(/dashboard\/profiel/, { timeout: 20000 }).catch(() => {});
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(800);
  console.log("URL", p.url());
  console.log("TEKST NA WISSEL:", (await p.locator("main").first().innerText().catch(()=>p.locator("body").innerText())).slice(0, 1000));
  await s.scherm("na-wissel-groenstijl");
  console.log("toasts:", await p.locator('[role="status"], [role="alert"]').allInnerTexts());
  console.log("consoleFouten", s.consoleFouten, "netwerk", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
