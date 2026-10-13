const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fk = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
const waarden = ["", "-5", "0", "2,5", "2.5", "1e9", "999999999999999", "🌳", "abc", "-0,5"];
(async () => {
  const s = await k.open({ agent: "edge-case-tester-1", viewport: "mobiel", pad: null, maxStappen: 250 });
  await s.ctx.route("https://api.pdok.nl/**", (r) => { const x = fk.antwoord(r.request().url()); return r.fulfill({ status: x.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(x.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: fk.TEGEL }));
  await s.goto("/embed/" + s.seed.a3.tools.tuinaanleg);
  await s.page.locator("input").first().fill("8011AB 5");
  await s.page.waitForTimeout(1200);
  const veld = s.page.getByLabel("Aantal Schutting");
  for (const w of waarden) {
    await veld.fill(w);
    await s.page.waitForTimeout(500);
    const raming = await s.page.evaluate(() => { const h = [...document.querySelectorAll("*")].find(e => e.children.length === 0 && /Jouw kostenraming/.test(e.textContent)); const root = h?.closest("section,aside,div[class]")?.parentElement || document.body; return root.innerText.replace(/\s+/g, " ").slice(0, 300); });
    console.log(JSON.stringify(w), "→ value=", JSON.stringify(await veld.inputValue()), "| raming:", raming);
  }
  // Ook: snel dubbel op + klikken
  await s.page.getByLabel("Schutting toevoegen").dblclick();
  await s.page.waitForTimeout(400);
  console.log("na dblclick + :", await veld.inputValue());
  await s.page.getByLabel("Schutting verminderen").click();
  await s.page.waitForTimeout(300);
  console.log("na - :", await veld.inputValue());
  console.log("ERRS", s.consoleFouten.slice(-5));
  await s.scherm("rekentool-schutting");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
