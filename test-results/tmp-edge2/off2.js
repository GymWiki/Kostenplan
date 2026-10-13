const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
const waarden = process.argv.slice(2);
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 80 });
  const p = s.page;
  const aantal = () => p.getByLabel("Aantal").nth(0);
  const totaal = async () => (await p.locator("body").innerText()).match(/Totaal incl\. btw\s*\n?(€[^\n]*)/)?.[1];
  const status = async () => (await p.locator("body").innerText()).match(/(Alles opgeslagen|Opslaan[^\n]*|Niet opgeslagen[^\n]*|Opslaan bezig[^\n]*)/)?.[1];
  await aantal().fill("24"); await aantal().blur(); await p.waitForTimeout(2500);
  s.stap(); await p.reload({ waitUntil: "networkidle" }); console.log("reset input", await aantal().inputValue(), await totaal());
  for (const w of waarden) {
    await aantal().fill(w); await aantal().blur(); await p.waitForTimeout(3000);
    console.log(`WAARDE "${w}" direct: input="${await aantal().inputValue()}" totaal=${await totaal()} status=${await status()}`);
    await s.scherm(`direct-${w}`.replace(/[^a-z0-9]+/gi,"_"));
    s.stap(); await p.reload({ waitUntil: "networkidle" });
    console.log(`  NA RELOAD: input="${await aantal().inputValue()}" totaal=${await totaal()} status=${await status()}`);
    s.stap(); await p.reload({ waitUntil: "networkidle" }).catch(()=>{});
    await p.waitForTimeout(500);
    await s.page.evaluate(()=>{}); 
    // reset naar 24
    await aantal().fill("24"); await aantal().blur(); await p.waitForTimeout(2500); s.stap(); await p.reload({ waitUntil: "networkidle" });
  }
  console.log("console", s.consoleFouten.slice(-5));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
