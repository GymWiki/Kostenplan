const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fk = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
(async () => {
  const s = await k.open({ agent: "persona-particulier", viewport: "mobiel", pad: null, maxStappen: 200 });
  await s.ctx.route("https://api.pdok.nl/**", (route) => { const r = fk.antwoord(route.request().url()); return route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(r.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: fk.TEGEL }));
  await s.goto("/t/devries-a1/tuinaanleg-a1");
  const p = s.page;
  await p.getByPlaceholder(/bijv/).first().fill("8011AB 5"); s.stap();
  await p.waitForTimeout(800);
  await p.getByRole("button", { name: /Voorstraat 5/ }).first().click().catch(()=>{}); s.stap();
  await p.getByLabel("Aantal Schutting").fill("12"); s.stap();
  await p.locator("#sv-lengte").fill("5"); s.stap();
  await p.locator("#sv-breedte").fill("4"); s.stap();
  const sels = await p.evaluate(() => [...document.querySelectorAll("select")].map((e) => ({ label: e.closest("div")?.innerText.slice(0,80).replace(/\n/g," | "), opts: [...e.options].map((o) => o.text), id: e.id, aria: e.getAttribute("aria-label") })));
  console.log(JSON.stringify(sels, null, 1));
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
