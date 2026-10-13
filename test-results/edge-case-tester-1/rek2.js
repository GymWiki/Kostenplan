const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fk = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
const raming = (s) => s.page.evaluate(() => { const h = [...document.querySelectorAll("*")].find(e => e.children.length === 0 && /Jouw kostenraming/.test(e.textContent)); const root = h?.closest("section,aside,div[class]")?.parentElement || document.body; return root.innerText.replace(/\s+/g, " ").slice(0, 260); });
(async () => {
  const s = await k.open({ agent: "edge-case-tester-1", viewport: "mobiel", pad: null, maxStappen: 250 });
  await s.ctx.route("https://api.pdok.nl/**", (r) => { const x = fk.antwoord(r.request().url()); return r.fulfill({ status: x.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(x.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: fk.TEGEL }));
  await s.goto("/embed/" + s.seed.a3.tools.tuinaanleg);
  await s.page.locator("input").first().fill("8011AB 5");
  await s.page.waitForTimeout(1200);
  const veld = s.page.getByLabel("Aantal Schutting");
  await veld.fill("2");
  await s.page.waitForTimeout(1200);
  console.log("RAMING 2:", await raming(s));
  const kn = await s.page.evaluate(() => [...document.querySelectorAll("input,select,button,textarea,[role=radio],[role=combobox]")].map(e => `${e.tagName} ${e.type||e.getAttribute("role")||""} aria=${e.getAttribute("aria-label")||""} txt=${(e.innerText||"").slice(0,40)}`).slice(18));
  console.log(kn.join("\n"));
  for (const w of ["abc", "🌳", "999999999999999"]) {
    await veld.fill(w);
    await s.page.waitForTimeout(2000);
    console.log(JSON.stringify(w), "value=", JSON.stringify(await veld.inputValue()), "RAMING:", await raming(s));
  }
  await s.scherm("rek-abc");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
