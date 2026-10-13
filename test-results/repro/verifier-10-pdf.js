const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { antwoord, TEGEL } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
(async () => {
  const s = await k.open({ agent: "verifier-10", viewport: "mobiel", pad: null });
  await s.ctx.route("https://api.pdok.nl/**", (r) => { const a = antwoord(r.request().url()); return r.fulfill({ status: a.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(a.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
  const p = s.page;
  await s.goto("/t/devries-a1/tuinaanleg-a1");
  await p.fill("#wg-adres", "8011AB 5"); await p.waitForTimeout(1500);
  await p.getByText("Voorstraat 5, 8011 AB Zwolle").first().click(); await p.waitForTimeout(1000);
  await p.getByLabel("Aantal Schutting").fill("12");
  await p.fill("#sv-lengte", "5"); await p.fill("#sv-breedte", "4");
  for (const sel of await p.locator("select[id^=materiaal-]").all()) await sel.selectOption({ index: 1 });
  await p.waitForTimeout(800);
  await p.pdf({ path: "test-results/repro/verifier-10-print.pdf", format: "A4" });
  await s.sluit();
})();
