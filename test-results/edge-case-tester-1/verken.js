const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "edge-case-tester-1", gebruiker: null, viewport: "mobiel", pad: null, maxStappen: 250 });
  await s.ctx.route("https://api.pdok.nl/**", (route) => { const r = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js").antwoord(route.request().url()); return route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(r.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js").TEGEL }));
  await s.goto("/embed/" + s.seed.a3.tools.tuinaanleg);
  console.log("URL", s.page.url());
  console.log("TITEL", await s.page.title());
  const elems = await s.page.evaluate(() => [...document.querySelectorAll("input,textarea,select,button")].map(e => `${e.tagName} type=${e.type||""} name=${e.name||""} aria=${e.getAttribute("aria-label")||""} txt=${(e.innerText||e.value||"").slice(0,50)}`));
  console.log(elems.join("\n"));
  console.log("TEXT", (await s.page.innerText("body")).slice(0, 800));
  console.log(await s.scherm("embed-start"));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
