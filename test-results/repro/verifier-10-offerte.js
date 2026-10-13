const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-10", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/leads" });
  const p = s.page;
  await p.waitForTimeout(800);
  await p.getByRole("radio", { name: "Alles" }).click(); await p.waitForTimeout(500);
  await p.getByRole("button", { name: /Cor Concept/ }).first().click(); await p.waitForTimeout(1500);
  await p.getByRole("link", { name: /Offerte bekijken\/bewerken/ }).first().click(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
  console.log(p.url());
  const t = await p.innerText("body");
  console.log(t.replace(/\n+/g," | ").slice(0,2500));
  await p.screenshot({ path: "test-results/screens/verifier-10/o1.png", fullPage: true });
  await s.sluit();
})();
