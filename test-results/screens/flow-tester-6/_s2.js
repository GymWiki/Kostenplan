const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { antwoord } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-6", viewport: "mobiel", pad: null });
  await s.ctx.route("https://api.pdok.nl/**", (route) => { const r = antwoord(route.request().url()); return route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(r.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js").TEGEL }));
  await s.goto("/t/devries-a2/tuinaanleg-a2");
  await s.scherm("klant-start");
  console.log((await s.page.locator("body").innerText()).slice(0, 1500));
  console.log("FOUTEN", s.consoleFouten.filter(x=>!x.includes("TUNNEL")), s.netwerkFouten);
  await s.sluit();
})().catch(e => { console.error("SCRIPTFOUT", e.message); process.exit(1); });
