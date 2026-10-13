const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 80 });
  const p = s.page;
  // -5 melding in DOM
  await p.getByLabel("Aantal").nth(0).fill("-5"); await p.getByLabel("Aantal").nth(0).blur(); await p.waitForTimeout(2500);
  console.log("MELDING -5:", await p.locator("body").innerText().then(t=>t.match(/Niet opgeslagen[\s\S]{0,200}/)?.[0]));
  await s.scherm("min5-melding");
  s.stap(); await p.reload({ waitUntil: "networkidle" });
  // onderwerp
  const ond = p.getByLabel("Onderwerp");
  const lang = "🌳🌳 " + "Aanleg ".repeat(70);
  console.log("lengte lang", lang.length);
  s.stap(); await ond.fill(lang); await ond.blur(); await p.waitForTimeout(2500);
  await s.scherm("onderwerp-lang");
  console.log("onderwerp status:", await p.locator("body").innerText().then(t=>t.match(/(Alles opgeslagen|Niet opgeslagen)/)?.[0]));
  s.stap(); await p.reload({ waitUntil: "networkidle" });
  const na = await p.getByLabel("Onderwerp").inputValue();
  console.log("NA RELOAD onderwerp len", na.length, "start:", na.slice(0,30), "maxlength attr:", await p.getByLabel("Onderwerp").getAttribute("maxlength"));
  await s.scherm("onderwerp-na-reload");
  // Prijs-element klikken
  s.stap(); await p.getByText("€ 88,87").first().click().catch(e=>console.log("klik prijs fout", e.message.slice(0,120)));
  await p.waitForTimeout(800);
  console.log("ACTIEF element na klik:", await p.evaluate(()=>document.activeElement.outerHTML.slice(0,200)));
  await s.scherm("prijs-klik");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
