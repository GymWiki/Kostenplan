const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
const status = async (p) => (await p.locator("body").innerText()).match(/(Alles opgeslagen|Niet opgeslagen|Opslaan…|Opslaan[^\n]*)/)?.[1] ?? "(geen)";
(async () => {
  const a = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const b = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  // beide tabs hebben nu dezelfde (verse) staat; B ging ook naar de pagina dus gelijk
  // Tab A: onderwerp
  await a.page.getByLabel("Onderwerp").fill("Tab A onderwerp"); await a.page.getByLabel("Onderwerp").blur();
  await a.page.waitForTimeout(3000);
  console.log("A status:", await status(a.page));
  // Tab B (verouderd): aantal rij 2 wijzigen
  await b.page.getByLabel("Aantal").nth(1).fill("7"); await b.page.getByLabel("Aantal").nth(1).blur();
  await b.page.waitForTimeout(3000);
  console.log("B status:", await status(b.page), "| B onderwerp-veld:", await b.page.getByLabel("Onderwerp").inputValue());
  await a.scherm("tab-a"); await b.scherm("tab-b");
  // herlaad A en kijk wat er staat
  await a.page.reload({ waitUntil: "networkidle" });
  console.log("NA RELOAD A: onderwerp=", await a.page.getByLabel("Onderwerp").inputValue(), "| aantal rij2=", await a.page.getByLabel("Aantal").nth(1).inputValue());
  await a.scherm("tab-a-na-reload");
  await a.sluit(); await b.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
