const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-10", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/tools/cmv71beox009du07di5knapuu" });
  const p = s.page; await p.waitForTimeout(1000);
  console.log("REGEL:", (await p.innerText("body")).match(/Schutting[^|]*?\n[^\n]*\n(20 m kost je klant[^\n]*)/)?.[1]);
  await p.getByText(/Schutting/).first().click(); await p.waitForTimeout(1200);
  console.log("PANEEL:", (await p.innerText("body")).replace(/\n+/g," | ").slice(0,1200));
  await p.getByText(/Opbouw voor 20 m/).first().click(); await p.waitForTimeout(800);
  console.log("OPBOUW:", (await p.innerText("body")).replace(/\n+/g," | ").slice(-900));
  await p.screenshot({ path: "test-results/screens/verifier-10/e3.png" });
  await s.sluit();
})();
