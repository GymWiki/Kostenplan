const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { antwoord, TEGEL } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-6", viewport: "mobiel", pad: null });
  const p = s.page;
  await s.ctx.route("https://api.pdok.nl/**", (route) => { const r = antwoord(route.request().url()); return route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(r.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
  await s.goto("/t/devries-a2/tuinaanleg-a2");
  const inputs = await p.locator("input").evaluateAll(els => els.map(e => ({ type: e.type, id: e.id, name: e.name, ph: e.placeholder, al: e.getAttribute("aria-label") })));
  console.log("INPUTS", JSON.stringify(inputs));
  const knoppen = await p.locator("button").evaluateAll(els => els.map(e => e.innerText.trim().slice(0,40)).filter(Boolean));
  console.log("KNOPPEN", JSON.stringify(knoppen.slice(0,40)));
  await s.sluit();
})().catch(e => { console.error("SCRIPTFOUT", e.message); process.exit(1); });
