const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fk = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
(async () => {
  const s = await k.open({ agent: "edge-case-tester-1", viewport: "mobiel", pad: null, maxStappen: 250 });
  await s.ctx.route("https://api.pdok.nl/**", (r) => { const x = fk.antwoord(r.request().url()); return r.fulfill({ status: x.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(x.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: fk.TEGEL }));
  await s.goto("/embed/" + s.seed.a3.tools.tuinaanleg);
  await s.page.getByPlaceholder("bijv. 8011 AB 12").or(s.page.locator("input").first()).fill("8011AB 5");
  await s.page.waitForTimeout(1500);
  console.log((await s.page.innerText("body")).slice(0, 2500));
  const elems = await s.page.evaluate(() => [...document.querySelectorAll("input,textarea,select,button")].map(e => `${e.tagName} type=${e.type||""} aria=${e.getAttribute("aria-label")||""} ph=${e.placeholder||""} txt=${(e.innerText||"").slice(0,40)}`));
  console.log(elems.join("\n"));
  await s.scherm("embed-adres");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
