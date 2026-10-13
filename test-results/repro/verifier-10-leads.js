const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-10", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/leads" });
  const p = s.page;
  await p.waitForTimeout(800);
  const sel = p.locator('select[aria-label="Filter op offertestatus"]:visible').first();
  await sel.selectOption({ label: "Concept" }); await p.waitForTimeout(800);
  const lijst = async () => { const t = (await p.innerText("main")); const i = t.indexOf("Alle leads"); return t.slice(i, i+400).replace(/\n+/g," | "); };
  console.log("MET NIEUW-TAB:", await lijst());
  await p.getByRole("radio", { name: "Alles" }).click(); await p.waitForTimeout(800);
  console.log("ALLES:", await lijst());
  await s.sluit();
})();
