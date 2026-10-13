const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const { antwoord, TEGEL } = require("/home/user/Kostenplan/scripts/mobile-ux/fake-pdok.js");
(async () => {
  const s = await k.open({ agent: "verifier-06", gebruiker: null, viewport: "mobiel", pad: null });
  await s.ctx.route("https://api.pdok.nl/**", (r) => { const a = antwoord(r.request().url()); return r.fulfill({ status: a.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(a.body) }); });
  await s.ctx.route("https://service.pdok.nl/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: TEGEL }));
  const p = s.page;
  await s.goto("/embed/" + s.seed.a1.tools.tuinaanleg);
  await p.locator("#wg-adres").fill("8011AB 5"); await p.waitForTimeout(1500);
  await p.getByRole("option").first().click(); await p.waitForTimeout(1500);
  const totaal = async () => (await p.locator("body").innerText()).match(/TOTAAL[^\n]*\n?[^\n]*/i)?.[0]?.replace(/\n/g," ");
  // item 6
  const sch = p.getByLabel("Aantal Schutting");
  await sch.fill("2"); await p.waitForTimeout(800);
  const m = p.locator("select, [role=radio], [role=combobox]"); console.log("keuzes", await m.count());
  console.log("na 2:", await totaal());
  for (const w of ["abc", "🌳"]) { await sch.fill(w); await p.waitForTimeout(800); console.log(w, "veld:", await sch.inputValue(), "| totaal:", await totaal(), "| alert:", await p.locator("[role=alert]").allInnerTexts()); }
  await s.scherm("abc");
  // item 5
  for (const w of ["999999999999999", "1000000000"]) { await sch.fill(w); await p.waitForTimeout(1500); console.log(w, "veld:", await sch.inputValue(), "| totaal:", await totaal(), "| alert:", await p.locator("[role=alert]").allInnerTexts()); }
  await s.scherm("enorm");
  // item 1
  await sch.fill("2"); await p.waitForTimeout(800);
  const sel = p.locator("select"); for (let i=0;i<await sel.count();i++){ const o=await sel.nth(i).locator("option").evaluateAll(e=>e.map(x=>x.value)); if(o.length>1) await sel.nth(i).selectOption(o[1]); }
  await p.getByLabel("Aantal Graszoden").fill("0");
  await p.waitForTimeout(1000);
  console.log("btn", await p.getByRole("button", { name: /offerte aanvragen/i }).isEnabled());
  await p.getByRole("button", { name: /offerte aanvragen/i }).click();
  await p.waitForTimeout(800);
  console.log((await p.locator("input,textarea").evaluateAll(e=>e.map(x=>(x.id||x.name)+"|"+x.maxLength))).join(" ; "));
  await p.getByLabel(/naam/i).first().fill("Ø🌳".repeat(250));
  await p.getByLabel(/e-?mail/i).first().fill("a".repeat(190)+"@test.nl");
  await p.getByLabel(/telefoon/i).first().fill("0".repeat(120));
  await p.getByRole("button", { name: /versturen|verstuur/i }).last().click();
  await p.waitForTimeout(2500);
  console.log("alerts:", await p.locator("[role=alert], .text-destructive").allInnerTexts());
  await s.scherm("lange-naam");
  await s.sluit();
})().catch(e=>{console.error(e);process.exit(1)});
