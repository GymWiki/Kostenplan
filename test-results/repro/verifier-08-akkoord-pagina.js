// /o/<token> als anonieme klant: console-fouten (#418) bij geaccepteerde en verstuurde offerte; link 'Getekende PDF'; en akkoord geven op verstuurde offerte.
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const seed = require("/home/user/Kostenplan/test-results/seed.json").a3.offerteTokens;
  for (const naam of ["offerte-verstuurd", "akkoord"]) {
    const s = await k.open({ agent: "verifier-08", viewport: "mobiel", pad: null });
    for (let i = 0; i < 2; i++) { await s.goto("/o/" + seed[naam]); await s.page.waitForTimeout(1000); }
    console.log(naam, "console:", s.consoleFouten);
    const l = s.page.getByRole("link", { name: /Getekende PDF/ });
    if (await l.count()) console.log("PDF-link:", await l.evaluate((e) => ({ href: e.getAttribute("href"), target: e.target, download: e.getAttribute("download") })));
    await s.sluit();
  }
})();
