const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "verifier-10", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard" });
  const p = s.page;
  const t0 = Date.now();
  await p.getByRole("link", { name: /Rekentools/ }).first().click();
  await p.waitForURL(/tools/);
  const sk = async () => p.evaluate(() => document.querySelectorAll("[class*=animate-pulse],[class*=skeleton]").length);
  console.log("skeletons direct", await sk());
  await p.waitForLoadState("networkidle"); console.log("networkidle na", Date.now()-t0, "ms; skeletons", await sk());
  await p.waitForTimeout(300); console.log("t+300", await sk());
  await p.screenshot({ path: "test-results/screens/verifier-10/t1.png" });
  console.log((await p.innerText("body")).replace(/\n+/g," | ").slice(0,500));
  await s.sluit();
})();
