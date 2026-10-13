const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/facturen/cmv6xym7700740s7d8h2wzb3g";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 30 });
  const p = s.page;
  const t = (await p.locator("body").innerText()).replace(/\n+/g,' | ');
  console.log(t.slice(0,420));
  console.log("Aantal-velden aanwezig:", await p.getByLabel("Aantal").count());
  await s.scherm("factuur-na-reload");
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
