// Afstand/voorrijkosten-regel (a3, PER_KM 0,50, straal 30): klant 3511AB 12 en 7311AA 10 voor en na opslaan werkgebied (autosave) + copy van de regel.
const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { antwoord, TEGEL } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
async function klant(adres) {
  const s = await k.open({ agent: "verifier-08", viewport: "mobiel", pad: null });
  await s.ctx.route("https://api.pdok.nl/**", (r) => { const a = antwoord(r.request().url()); return r.fulfill({ status: a.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(a.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
  await s.goto("/t/devries-a3/tuinaanleg-a3");
  const p = s.page;
  await p.locator("#wg-adres").fill(adres); await p.waitForTimeout(900);
  await p.getByRole("option").first().click(); await p.waitForTimeout(600);
  await p.getByLabel("Aantal Graszoden").fill("20"); await p.locator("select").first().selectOption({ index: 1 }).catch(() => {});
  await p.waitForTimeout(800);
  const t = (await p.locator("body").innerText()).replace(/\s+/g, " ");
  await s.sluit();
  return (t.match(/Voorrijkosten extra afstand[^€]*€\s*[\d.,]+/) || ["(geen afstandsregel)"])[0];
}
(async () => {
  for (const a of ["3511AB 12", "7311AA 10"]) console.log("VOOR ", a, "->", await klant(a));
  const h = await k.open({ agent: "verifier-08", gebruiker: "a3", viewport: "desktop", pad: "/dashboard/profiel/werkgebied" });
  const p = h.page; await p.waitForTimeout(1500);
  const veld = p.locator("#wg-straal");
  console.log("straalveld:", await veld.count(), await veld.inputValue().catch(() => null));
  await veld.fill("31"); await p.waitForTimeout(2500);
  await veld.fill("30"); await p.waitForTimeout(3000);
  console.log("tekst:", (await p.locator("body").innerText()).match(/Opgeslagen|Opslaan/g));
  await h.sluit();
  for (const a of ["3511AB 12", "7311AA 10"]) console.log("NA   ", a, "->", await klant(a));
})();
