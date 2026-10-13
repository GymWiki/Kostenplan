// Herhaling bevinding flow-tester-6 "1 cent boven minimum": klant, a3-kopie (minimum 1500 TARIEF), Graszoden m2 = 1 / 2 / 5 / 20 / 200.
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { antwoord, TEGEL } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
(async () => {
  for (const m2 of ["1", "2", "3", "5", "10", "20", "200"]) {
    const s = await k.open({ agent: "verifier-08", viewport: "mobiel", pad: null });
    await s.ctx.route("https://api.pdok.nl/**", (r) => { const a = antwoord(r.request().url()); return r.fulfill({ status: a.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(a.body) }); });
    await s.ctx.route("https://service.pdok.nl/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
    await s.goto("/t/devries-a3/tuinaanleg-a3");
    const p = s.page;
    await p.locator("#wg-adres").fill("8011AB 5"); await p.waitForTimeout(900);
    await p.getByRole("option").first().click(); await p.waitForTimeout(600);
    await p.getByLabel("Aantal Graszoden").fill(m2);
    await p.locator("select").first().selectOption({ index: 1 }).catch(() => {});
    await p.waitForTimeout(800);
    const t = (await p.locator("body").innerText()).replace(/\s+/g, " ");
    const i = t.indexOf("Jouw kostenraming");
    if (m2 === "1") await s.scherm("min-1m2");
    console.log(m2 + " m2 ->", t.slice(i, i + 420));
    await s.sluit();
  }
})();
