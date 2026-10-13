const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/facturen/cmv6xym7700740s7d8h2wzb3g";
const waarden = ["-5", "0", "1000000000", "abc", "2.5", "2,5"];
const status = async (p) => (await p.locator("body").innerText()).match(/(Alles opgeslagen|Niet opgeslagen[\s\S]{0,160}|Opslaan…)/)?.[0]?.replace(/\n/g,' / ');
const totaal = async (p) => (await p.locator("body").innerText()).match(/Totaal incl\. btw\s*\n?(€[^\n]*)/)?.[1];
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 80 });
  const p = s.page;
  const a = () => p.getByLabel("Aantal").nth(3);
  for (const w of waarden) {
    s.stap(); await a().fill(w); await a().blur(); await p.waitForTimeout(2500);
    console.log(`FACTUUR "${w}" -> input="${await a().inputValue()}" totaal=${await totaal(p)} | ${await status(p)}`);
    s.stap(); await p.reload({ waitUntil: "networkidle" });
    console.log(`   na reload input="${await a().inputValue()}" totaal=${await totaal(p)}`);
    if (w==="1000000000") await s.scherm("factuur-1e9");
  }
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
