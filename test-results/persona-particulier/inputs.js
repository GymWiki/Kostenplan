const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fk = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
(async () => {
  const s = await k.open({ agent: "persona-particulier", viewport: "mobiel", pad: null });
  await s.ctx.route("https://api.pdok.nl/**", (route) => { const r = fk.antwoord(route.request().url()); return route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(r.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: fk.TEGEL }));
  await s.goto("/t/devries-a1/tuinaanleg-a1");
  await s.page.getByPlaceholder(/bijv/).first().fill("8011AB 5");
  await s.page.waitForTimeout(1200);
  const info = await s.page.evaluate(() => [...document.querySelectorAll("input,button,[role=button],label,select,textarea")].map((e) => ({ tag: e.tagName, type: e.type, name: e.name, id: e.id, ph: e.placeholder, aria: e.getAttribute("aria-label"), txt: (e.innerText || e.value || "").slice(0, 60), inTxt: (e.closest("section,li,div")?.innerText || "").slice(0, 60).replace(/\n/g," | ") })));
  console.log(JSON.stringify(info, null, 1));
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
