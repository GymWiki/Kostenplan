const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fk = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
exports.open = async (opts = {}) => {
  const s = await k.open({ agent: "edge-case-tester-1", viewport: opts.vp || "mobiel", pad: null, maxStappen: 250, netwerk: opts.netwerk || null });
  await s.ctx.route("https://api.pdok.nl/**", (r) => { const x = fk.antwoord(r.request().url()); return r.fulfill({ status: x.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(x.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: fk.TEGEL }));
  return s;
};
exports.klaar = async (s, tool) => {
  await s.goto("/embed/" + tool);
  await s.page.locator("input").first().fill("8011AB 5");
  await s.page.waitForTimeout(1000);
  await s.page.getByLabel("Aantal Graszoden").fill("10");
  await s.page.waitForTimeout(500);
  const sel = s.page.locator("select").first(); await sel.selectOption({ index: 1 });
  await s.page.waitForTimeout(800);
};
exports.tekst = async (s) => (await s.page.innerText("body")).replace(/\n+/g, " | ");
