const h = require("./h.js");
(async () => {
  const s = await h.open();
  await s.goto("/embed/" + s.seed.a3.tools.tuinaanleg);
  await s.page.locator("input").first().fill("8011AB 5");
  await s.page.waitForTimeout(1000);
  const v = s.page.getByLabel("Aantal Graszoden");
  for (const w of ["-5", "99999999", "1,5", "2.000.000"]) {
    await v.fill(w); await s.page.waitForTimeout(900);
    const t = (await h.tekst(s)); const m = t.match(/TOTAAL \(INCL\. BTW\) \| (€ [\d.,]+)/);
    console.log(JSON.stringify(w), "value=", JSON.stringify(await v.inputValue()), "totaal=", m && m[1], "| tekst:", t.includes("Kies een onderdeel") ? "kies-onderdeel" : "");
  }
  await s.scherm("enorm-graszoden");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message.slice(0, 300)); process.exit(1); });
