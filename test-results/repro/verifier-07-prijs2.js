const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const L = k.seed().a2.leads["offerte-concept"];
const pad="/dashboard/leads/"+L+"/offerte";
(async()=>{
const s = await k.open({agent:"verifier-07",gebruiker:"a2",viewport:"desktop",pad});
const p=s.page;
const status=async()=> (await p.locator("body").innerText()).match(/Alles opgeslagen|Opslaan…|Niet opgeslagen[^\n]*/)?.[0];
// regel selecteren: laatste 'Nieuwe sectie' regel
await p.getByRole("button",{name:/Sectie toevoegen/}).click(); await p.waitForTimeout(1500); await p.getByRole("button",{name:/Regel toevoegen/}).last().click(); await p.waitForTimeout(1500);
for (const v of ["12.50","1,234.56","12,50","1.234,56","-3","1.5"]) {
  await p.locator("#rg-prijs").fill(v); const typed=await p.locator("#rg-prijs").inputValue();
  await p.locator("#rg-omschr").focus(); await p.waitForTimeout(2500);
  const na=await p.locator("#rg-prijs").inputValue();
  console.log(JSON.stringify({v,typed,naBlur:na,status:await status()}));
}
await p.locator("#rg-prijs").fill("12.50"); await p.locator("#rg-omschr").focus(); await p.waitForTimeout(2500);
await p.reload({waitUntil:"networkidle"});
console.log(await p.locator("main").innerText().then(t=>t.split("\n").filter(l=>/€/.test(l)).slice(-12)));
await s.scherm("na-reload");
await s.sluit();})();
