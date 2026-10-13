const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { antwoord, TEGEL } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
const route = async (ctx) => { await ctx.route("https://api.pdok.nl/**", (r) => { const a = antwoord(r.request().url()); return r.fulfill({ status: a.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(a.body) }); }); await ctx.route("https://service.pdok.nl/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: TEGEL })); };
(async () => {
  // 8 + 9
  let s = await k.open({ agent: "verifier-06", viewport: "mobiel", pad: null }); await route(s.ctx);
  await s.goto("/t/devries-a1/tuinaanleg-a1");
  const t = await s.page.locator("body").innerText();
  console.log("intro:", /Geef bij de onderdelen/.test(t), "| aantal-velden zichtbaar voor postcode:", await s.page.locator('input[aria-label^="Aantal"]').count());
  const ax = await k.axe(s.page); console.log("axe ernstig:", JSON.stringify(ax.ernstig));
  await s.scherm("klant"); await s.sluit();
  // 11
  s = await k.open({ agent: "verifier-06", viewport: "desktop", pad: null }); await route(s.ctx);
  await s.goto("/test-embed?tool=" + s.seed.a1.tools.tuinaanleg + "&modus=iframe");
  const fr = s.page.frameLocator("iframe").first();
  await fr.locator("#wg-adres").fill("8011AB 5"); await s.page.waitForTimeout(1500);
  await fr.getByRole("option").first().click(); await s.page.waitForTimeout(1500);
  await fr.getByLabel("Aantal Schutting").fill("30");
  const sel = fr.locator("select"); for (let i=0;i<await sel.count();i++){ const o=await sel.nth(i).locator("option").evaluateAll(e=>e.map(x=>x.value)); if(o.length>1) await sel.nth(i).selectOption(o[1]); }
  await s.page.waitForTimeout(1200);
  for (const n of [/offerte aanvragen/i, /bewaar als pdf/i]) { const b = fr.getByRole("button", { name: n }); const bb = await b.boundingBox(); console.log(String(n), "hoogte", bb && bb.height, "breedte", bb && bb.width); }
  await s.scherm("embed-knoppen"); await s.sluit();
})().catch(e=>{console.error(e);process.exit(1)});
