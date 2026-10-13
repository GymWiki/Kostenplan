const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
const waarden = ["12,50", "12.50", "1.234,56", "1,234.56", "-3", "abc", "9999999999999"];
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 120 });
  const p = s.page;
  s.stap(); await p.getByRole("button", { name: "Sectie toevoegen" }).click(); await p.waitForTimeout(800);
  s.stap(); await p.getByRole("button", { name: "Regel toevoegen" }).last().click(); await p.waitForTimeout(800);
  const h = await p.locator('input[value="0,00"]').first().elementHandle();
  for (const w of waarden) {
    s.stap();
    await h.fill(w); await h.evaluate(e => e.blur()); await p.waitForTimeout(2000);
    const tot = (await p.locator("body").innerText()).match(/Totaal incl\. btw\s*\n?(€[^\n]*)/)?.[1];
    const st = (await p.locator("body").innerText()).match(/(Alles opgeslagen|Niet opgeslagen[\s\S]{0,140})/)?.[0];
    console.log(`PRIJS "${w}" -> input="${await h.inputValue()}" totaal=${tot} | ${st?.replace(/\n/g,' / ')}`);
  }
  await s.scherm("prijs-tests");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
