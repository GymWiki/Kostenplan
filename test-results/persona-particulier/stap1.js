const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { pdokNep } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js").antwoord ? { pdokNep: null } : {};
(async () => {
  const s = await k.open({ agent: "persona-particulier", gebruiker: null, viewport: "mobiel", pad: null, maxStappen: 200 });
  await s.ctx.route("https://api.pdok.nl/**", (route) => {
    const r = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js").antwoord(route.request().url());
    return route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(r.body) });
  });
  await s.ctx.route("https://service.pdok.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js").TEGEL }));
  await s.goto("/t/devries-a1/tuinaanleg-a1");
  console.log("URL", s.page.url());
  console.log("SCHERM", await s.scherm("start"));
  console.log((await s.page.innerText("body")).slice(0, 4000));
  console.log("CONSOLE", s.consoleFouten, "NET", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
