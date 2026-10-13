const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { antwoord, TEGEL } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
const raming = async (p) => { const t = await p.innerText("body"); const i = t.indexOf("Jouw kostenraming"); return t.slice(i, i + 800).replace(/\n+/g, " | "); };
(async () => {
  const s = await k.open({ agent: "verifier-10", gebruiker: null, viewport: "mobiel", pad: null });
  await s.ctx.route("https://api.pdok.nl/**", (r) => { const a = antwoord(r.request().url()); return r.fulfill({ status: a.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(a.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
  await s.ctx.addInitScript(() => { window.__print = 0; window.print = () => { window.__print++; }; });
  const p = s.page;
  await s.goto("/t/devries-a1/tuinaanleg-a1");
  await p.fill("#wg-adres", "8011AB 5"); await p.waitForTimeout(1500);
  await p.getByText("Voorstraat 5, 8011 AB Zwolle").first().click(); await p.waitForTimeout(1000);
  await p.getByLabel("Aantal Schutting").fill("12"); await p.waitForTimeout(1000);
  console.log("A schutting 12:", await raming(p));
  const y = await p.evaluate(() => document.evaluate("//*[normalize-space(text())='Jouw kostenraming']", document, null, 9).singleNodeValue.getBoundingClientRect().top + scrollY);
  console.log("kostenraming y =", y);
  await p.fill("#sv-lengte", "5"); await p.fill("#sv-breedte", "4"); await p.waitForTimeout(1000);
  console.log("B + terras:", await raming(p));
  // materialen
  console.log(await p.evaluate(() => [...document.querySelectorAll("select,[role=combobox],[role=radio],input[type=radio]")].map(e => e.tagName + ":" + (e.getAttribute("aria-label")||e.name||e.id||e.innerText||"").slice(0,50)).join("\n")));
  await p.screenshot({ path: "test-results/screens/verifier-10/k2.png", fullPage: true });
  await s.sluit();
})();
