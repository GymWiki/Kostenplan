const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fk = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
(async () => {
  const s = await k.open({ agent: "persona-particulier", viewport: "mobiel", pad: null });
  await s.ctx.route("https://api.pdok.nl/**", (route) => { const r = fk.antwoord(route.request().url()); return route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(r.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: fk.TEGEL }));
  await s.goto("/t/devries-a1/tuinaanleg-a1");
  const inp = s.page.getByPlaceholder(/bijv/).first();
  await inp.click(); s.stap();
  await inp.fill("8011AB 5"); s.stap();
  await s.page.waitForTimeout(1500);
  console.log("SCHERM", await s.scherm("postcode-ingevuld"));
  console.log((await s.page.innerText("body")).slice(0, 5000));
  console.log("CONSOLE", s.consoleFouten, "NET", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
