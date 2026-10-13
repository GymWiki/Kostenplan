const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
const waarden = ["0", "-5", "1000000000", "abc", "2,5", "2.5"];
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 80 });
  const p = s.page;
  const aantal = p.getByLabel("Aantal").nth(0);
  const totaal = async () => (await p.locator("body").innerText()).match(/Totaal incl\. btw\s*\n?(€[^\n]*)/)?.[1];
  console.log("start totaal", await totaal(), "waarde", await aantal.inputValue());
  for (const w of waarden) {
    s.stap();
    await aantal.fill(w);
    await aantal.blur();
    await p.waitForTimeout(2500);
    const status = (await p.locator("body").innerText()).match(/(Alles opgeslagen|Opslaan[^\n]*|Niet opgeslagen[^\n]*|Wijzigingen[^\n]*|Fout[^\n]*|Kon[^\n]*)/)?.[1];
    console.log(`WAARDE "${w}" -> input="${await aantal.inputValue()}" totaal=${await totaal()} status=${status}`);
    await s.scherm(`aantal-${w}`.replace(/[^a-z0-9]+/gi,"_"));
    if (w === "1000000000") console.log("DOM-msgs", await p.locator('[role="alert"],[aria-live],.error,[class*=error]').allInnerTexts());
  }
  // persistentie: reload
  s.stap(); await p.reload({ waitUntil: "networkidle" });
  console.log("NA RELOAD input=", await p.getByLabel("Aantal").nth(0).inputValue(), "totaal", await totaal());
  console.log("console", s.consoleFouten.slice(-5), "net", s.netwerkFouten.slice(-5));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
