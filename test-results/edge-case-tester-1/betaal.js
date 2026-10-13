const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json");
const url = "/dashboard/facturen/" + seed.a3.facturen.verstuurd;
const teller = async (s) => { const t = await s.page.innerText("body"); const m = t.match(/Betalingen\n([\s\S]*?)(Herinnering|Tijdlijn|$)/); return m ? m[1].replace(/\n+/g, " | ").slice(0, 300) : "(geen betalingen-blok)"; };
(async () => {
  const s = await k.open({ agent: "edge-case-tester-1", gebruiker: "a3", viewport: "desktop", pad: url, maxStappen: 250 });
  await s.page.waitForTimeout(800);
  console.log("VOOR:", await teller(s));
  await s.page.getByRole("button", { name: "Betaling registreren" }).first().click();
  await s.page.waitForTimeout(700);
  const inputs = await s.page.evaluate(() => [...document.querySelectorAll("[role=dialog] input, [role=dialog] select, aside input, aside select")].map(e => `${e.tagName} ${e.type} name=${e.name} aria=${e.getAttribute("aria-label")||""} val=${e.value}`));
  console.log(inputs.join("\n"));
  const veld = s.page.locator("[role=dialog] input, aside input, [role=dialog] input[type=text], [role=dialog] input[inputmode]").first();
  for (const w of ["0", "-5", "1000000", "12,5"]) {
    await veld.fill(w);
    await s.page.getByRole("button", { name: "Betaling opslaan" }).click();
    await s.page.waitForTimeout(1500);
    const fout = await s.page.evaluate(() => [...document.querySelectorAll("[role=dialog] *, aside *")].filter(e => e.children.length === 0 && /bedrag|fout|ongeldig|kan|hoger|Vul|positief|minimaal|maximaal|open/i.test(e.textContent) && e.textContent.length < 160).map(e => e.textContent.trim()).slice(0, 4));
    console.log(`BEDRAG ${JSON.stringify(w)} -> veld ${JSON.stringify(await veld.inputValue())} meldingen ${JSON.stringify(fout)} dialog-open ${await s.page.locator("[role=dialog]").count()}`);
    await s.scherm("betaal-" + w.replace(/[^0-9a-z]/gi, "x"));
    if (await s.page.getByRole("button", { name: "Betaling opslaan" }).count()) { /* blijft open */ }
  }
  console.log("NA TESTS:", await teller(s));
  console.log("CONSOLE", s.consoleFouten.slice(-3));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message.slice(0, 400)); process.exit(1); });
