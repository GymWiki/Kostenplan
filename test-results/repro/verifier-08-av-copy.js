// Controle-stap bij Versturen: 'geen algemene voorwaarden bijgevoegd' terwijl het document een voorwaardensectie heeft (a3, echte aanvraag-lead).
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const h = await k.open({ agent: "verifier-08", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/leads/cmv7111hc0016b07dp6cp1q0q/offerte" });
  const p = h.page; await p.waitForTimeout(2500);
  console.log("heeft voorwaardensectie:", /Voorwaarden en uitsluitingen/.test(await p.locator("body").innerText()));
  await p.getByRole("button", { name: /Versturen/ }).first().click(); await p.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) { const t = (await p.locator("body").innerText()).replace(/\s+/g, " "); const m = t.match(/[^.]*algemene voorwaarden[^.]*\./gi); if (m) { console.log(m); break; } const b = p.getByRole("button", { name: /Verder|Volgende|Controle/ }).first(); if (await b.count()) await b.click().catch(()=>{}); await p.waitForTimeout(1200); }
  await h.scherm("versturen");
  await h.sluit();
})();
