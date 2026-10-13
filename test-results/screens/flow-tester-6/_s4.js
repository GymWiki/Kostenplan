const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { antwoord, TEGEL } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-6", viewport: "mobiel", pad: null });
  const p = s.page;
  await s.ctx.route("https://api.pdok.nl/**", (route) => { const r = antwoord(route.request().url()); return route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(r.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
  await s.goto("/t/devries-a2/tuinaanleg-a2");
  s.stap();
  await p.locator("#wg-adres").fill("8011AB 5");
  await p.waitForTimeout(1200);
  await s.scherm("adres-suggesties");
  const opties = await p.locator("[role=option], [role=listbox] li, [role=listbox] button").allInnerTexts().catch(()=>[]);
  console.log("OPTIES", JSON.stringify(opties));
  if (opties.length) { await p.locator("[role=option], [role=listbox] li, [role=listbox] button").first().click(); }
  await p.waitForTimeout(1500);
  await s.scherm("adres-gekozen");
  console.log((await p.locator("body").innerText()).slice(0, 2000));
  console.log("FOUTEN", s.consoleFouten.filter(x=>!x.includes("TUNNEL")), s.netwerkFouten);
  await s.sluit();
})().catch(e => { console.error("SCRIPTFOUT", e.message); process.exit(1); });
