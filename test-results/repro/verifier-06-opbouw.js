const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-06", gebruiker: "a1", viewport: "mobiel", pad: null });
  const tool = s.seed.a1.tools.tuinaanleg, prod = s.seed.a1.products;
  await s.goto(`/dashboard/tools/${tool}`); await s.page.waitForTimeout(800);
  console.log("kaart:", (await s.page.locator("body").innerText()).match(/[^\n]*kost je klant[^\n]*/g));
  await s.goto(`/dashboard/tools/${tool}?paneel=werkzaamheid%3A${prod[1]}`); await s.page.waitForTimeout(1000);
  console.log("voet:", (await s.page.locator("body").innerText()).match(/Opbouw voor[^\n]*\n[^\n]*/g));
  await s.scherm("opbouw"); await s.sluit();
})();
