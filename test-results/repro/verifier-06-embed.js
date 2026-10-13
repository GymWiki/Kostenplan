const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { antwoord, TEGEL } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
(async () => {
  const s = await k.open({ agent: "verifier-06", gebruiker: null, viewport: "mobiel", pad: null });
  await s.ctx.route("https://api.pdok.nl/**", (r) => { const a = antwoord(r.request().url()); return r.fulfill({ status: a.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(a.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
  const p = s.page;
  await s.goto("/embed/" + s.seed.a1.tools.tuinaanleg);
  await p.locator("#wg-adres").fill("8011AB 5");
  await p.waitForTimeout(1500);
  const opts = p.getByRole("option"); console.log("opties", await opts.count());
  if (await opts.count()) await opts.first().click(); else await p.locator("#wg-adres").press("Enter");
  await p.waitForTimeout(1500);
  const nums = p.locator('input[inputmode="numeric"], input[type=number], input[inputmode="decimal"]');
  console.log("aantal numerieke velden", await nums.count());
  console.log(await p.locator('input,button,select').evaluateAll(e=>e.map(x=>x.tagName+'|'+(x.getAttribute('aria-label')||x.id||x.innerText||'').slice(0,40)+'|'+x.type+'|'+(x.getAttribute('inputmode')||''))));
  await s.scherm("embed-start");
  await s.sluit();
})().catch(e=>{console.error(e);process.exit(1)});
