const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { antwoord, TEGEL } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
const raming = async (p) => { const t = await p.innerText("body"); const i = t.indexOf("Jouw kostenraming"); return t.slice(i, i + 900).replace(/\n+/g, " | "); };
(async () => {
  const s = await k.open({ agent: "verifier-10", gebruiker: null, viewport: "mobiel", pad: null });
  await s.ctx.route("https://api.pdok.nl/**", (r) => { const a = antwoord(r.request().url()); return r.fulfill({ status: a.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(a.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
  await s.ctx.addInitScript(() => { window.__print = 0; window.print = () => { window.__print++; }; });
  const p = s.page;
  await s.goto("/t/devries-a1/tuinaanleg-a1");
  await p.fill("#wg-adres", "8011AB 5"); await p.waitForTimeout(1500);
  await p.getByText("Voorstraat 5, 8011 AB Zwolle").first().click(); await p.waitForTimeout(1000);
  await p.getByLabel("Aantal Schutting").fill("12");
  await p.fill("#sv-lengte", "5"); await p.fill("#sv-breedte", "4");
  for (const sel of await p.locator("select[id^=materiaal-]").all()) { const opts = await sel.locator("option").allInnerTexts(); console.log("opties", opts); await sel.selectOption({ index: 1 }); }
  await p.waitForTimeout(1000);
  console.log("MET MATERIAAL:", await raming(p));
  const y = await p.evaluate(() => { const e = document.evaluate("//*[normalize-space(text())='Jouw kostenraming']", document, null, 9).singleNodeValue; return e.getBoundingClientRect().top + scrollY; });
  console.log("kostenraming y =", y, "scrollHeight", await p.evaluate(() => document.documentElement.scrollHeight));
  // sticky totaal?
  await p.evaluate(() => scrollTo(0, 800)); await p.waitForTimeout(300);
  console.log("zichtbaar 'Totaal' bij scroll 800:", await p.evaluate(() => [...document.querySelectorAll("*")].filter(e => /totaal/i.test(e.childNodes.length===1 && e.textContent) && e.getBoundingClientRect().top>0 && e.getBoundingClientRect().top<915).map(e=>e.textContent.slice(0,40))));
  await p.getByRole("button", { name: "Bewaar als PDF" }).click(); await p.waitForTimeout(1500);
  console.log("print calls:", await p.evaluate(() => window.__print), "pages:", s.ctx.pages().length);
  await p.getByRole("button", { name: "Offerte aanvragen" }).click(); await p.waitForTimeout(800);
  await p.screenshot({ path: "test-results/screens/verifier-10/k3-formulier.png" });
  const t = await p.innerText("body"); console.log("FORM:", t.slice(t.indexOf("Jouw kostenraming")).replace(/\n+/g," | ").slice(0,1500));
  const stamp = Date.now();
  await p.getByLabel(/Naam/).fill("Verifier Tien"); await p.getByLabel(/E-mail/).fill(`verifier10-${stamp}@test.nl`);
  await p.getByRole("button", { name: /Versturen/ }).click(); await p.waitForTimeout(2500);
  const t2 = await p.innerText("body"); console.log("NA VERSTUREN:", t2.slice(t2.indexOf("Jouw kostenraming")).replace(/\n+/g," | ").slice(0,800));
  console.log("PDF-knop aanwezig:", await p.getByRole("button", { name: "Bewaar als PDF" }).count(), "Totaal zichtbaar:", /TOTAAL|Totaal \(incl/.test(t2.slice(t2.indexOf("Jouw kostenraming"))));
  await p.screenshot({ path: "test-results/screens/verifier-10/k4-na.png", fullPage: true });
  await s.sluit();
})();
