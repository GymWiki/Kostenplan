const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/leads/cmv6xym4d00630s7d7rzjfxq8/offerte";
const status = async (p) => (await p.locator("body").innerText()).match(/(Alles opgeslagen|Niet opgeslagen|Opslaan[^\n]*|Wijzigingen[^\n]*|Offline[^\n]*|Geen verbinding[^\n]*|Bezig[^\n]*)/)?.[1] ?? "(geen statusregel)";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, netwerk: "slow3g", maxStappen: 120 });
  const p = s.page;
  const aantal = p.getByLabel("Aantal").nth(0);
  // 1. Slow 3G
  s.stap(); await aantal.fill("30"); await aantal.blur();
  const t0 = Date.now(); let last = "";
  while (Date.now() - t0 < 25000) { const st = await status(p); if (st !== last) { console.log(`[slow3g ${((Date.now()-t0)/1000).toFixed(1)}s] ${st.replace(/\n/g,' / ')}`); last = st; } if (/Alles opgeslagen/.test(st)) break; await p.waitForTimeout(400); }
  await s.scherm("slow3g-na-opslaan");
  // 2. Offline
  await s.ctx.setOffline(true);
  s.stap(); await aantal.fill("31"); await aantal.blur();
  await p.waitForTimeout(6000);
  console.log("[offline 6s] status:", (await status(p)).replace(/\n/g,' / '), "| input:", await aantal.inputValue());
  await s.scherm("offline-bewerkt");
  s.stap(); await p.getByLabel("Onderwerp").fill("Aanleg tuin offline"); await p.getByLabel("Onderwerp").blur();
  await p.waitForTimeout(4000);
  console.log("[offline onderwerp] status:", (await status(p)).replace(/\n/g,' / '));
  await s.ctx.setOffline(false);
  await p.waitForTimeout(8000);
  console.log("[weer online +8s] status:", (await status(p)).replace(/\n/g,' / '));
  await s.scherm("weer-online");
  s.stap(); await p.reload({ waitUntil: "networkidle" }).catch(e=>console.log("reload fout", e.message.slice(0,100)));
  console.log("NA RELOAD aantal:", await p.getByLabel("Aantal").nth(0).inputValue(), "onderwerp:", await p.getByLabel("Onderwerp").inputValue(), "totaal", (await p.locator("body").innerText()).match(/Totaal incl\. btw\s*\n?(€[^\n]*)/)?.[1]);
  console.log("console:", s.consoleFouten.slice(-4), "net:", s.netwerkFouten.slice(-3));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
