const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-10", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/tools/cmv71beox009du07di5knapuu" });
  const p = s.page; await p.waitForTimeout(1000);
  // Item 2: sheet bij Schutting
  const kaart = p.locator("li,div").filter({ hasText: /^Schutting/ }).filter({ has: p.getByRole("button", { name: /Prijzen/ }) }).last();
  const btns = await p.getByRole("button", { name: /Prijzen/ }).all(); console.log("prijzen-knoppen", btns.length);
  await btns[1].click(); await p.waitForTimeout(1200);
  await p.screenshot({ path: "test-results/screens/verifier-10/e2.png" });
  const t = await p.innerText("body"); console.log(t.replace(/\n+/g," | ").slice(0,2500));
  await s.sluit();
})();
