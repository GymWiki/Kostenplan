const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
const waarde = process.argv[2];
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  s.stap(); await p.getByRole("button", { name: "Sectie toevoegen" }).click(); await p.waitForTimeout(800);
  s.stap(); await p.getByRole("button", { name: "Regel toevoegen" }).last().click(); await p.waitForTimeout(800);
  const h = await p.locator('input[value="0,00"]').first().elementHandle();
  s.stap(); await h.fill(waarde); await h.evaluate(e => e.blur()); await p.waitForTimeout(2500);
  console.log(`VOOR RELOAD "${waarde}": input="${await h.inputValue()}"`);
  await s.scherm("voor-reload-"+waarde.replace(/[^0-9a-z]/gi,'_'));
  s.stap(); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(500);
  const rijen = await p.evaluate(()=>[...document.querySelectorAll('table.og-tabel tr')].slice(-3).map(r=>[...r.querySelectorAll('input')].map(i=>i.value).concat([...r.querySelectorAll('td:not(:has(input))')].map(t=>t.innerText.trim())).join(' | ')));
  console.log("NA RELOAD laatste rijen:\n"+rijen.join("\n"));
  console.log("Totaal:", (await p.locator("body").innerText()).match(/Totaal incl\. btw\s*\n?(€[^\n]*)/)?.[1]);
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
