const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = `/dashboard/facturen/cmv6xym7700740s7d8h2wzb3g`;
const samenvat = async (p) => (await p.locator("body").innerText()).replace(/\n+/g,' | ').match(/Betaald[^]{0,120}/)?.[0];
(async () => {
  const a = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const b = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  for (const s of [a, b]) { s.stap(); await s.page.getByRole("button", { name: "Betaling registreren" }).click(); await s.page.waitForTimeout(600); }
  const bedrag = (s) => s.page.getByLabel("Bedrag (€)");
  a.stap(); await bedrag(a).fill("2000"); 
  b.stap(); await bedrag(b).fill("5037,97");
  // gelijktijdig opslaan
  const [ra, rb] = await Promise.all([
    a.page.getByRole("button", { name: "Betaling opslaan" }).click().then(()=>"ok").catch(e=>"fout "+e.message.slice(0,80)),
    b.page.getByRole("button", { name: "Betaling opslaan" }).click().then(()=>"ok").catch(e=>"fout "+e.message.slice(0,80)),
  ]);
  console.log("klik A:", ra, "| klik B:", rb);
  await a.page.waitForTimeout(3000);
  for (const [nm, s] of [["A", a], ["B", b]]) {
    console.log(nm, "dialoog open:", await s.page.locator('[role=dialog]').count(), "| tekst:", (await s.page.locator("body").innerText()).replace(/\n+/g,' | ').match(/Betaald[^]{0,140}/)?.[0]);
    await s.scherm("betaling-na-opslaan-"+nm);
  }
  console.log("A fouten:", a.consoleFouten.slice(-3), "B fouten:", b.consoleFouten.slice(-3));
  await a.sluit(); await b.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
