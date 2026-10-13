const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = `/dashboard/facturen/cmv6xym7700740s7d8h2wzb3g`;
(async () => {
  const b = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = b.page;
  console.log("B dialoog nu:", (await p.locator('[role=dialog]').allInnerTexts()).map(x=>x.replace(/\n+/g,' / ').slice(0,500)));
  await b.scherm("B-dialoog-stale");
  b.stap(); await p.reload({ waitUntil: "networkidle" });
  console.log("B na reload:", (await p.locator("body").innerText()).replace(/\n+/g,' | ').match(/Betaald[^]{0,200}/)?.[0]);
  console.log("Betalingen-blok:", (await p.locator("body").innerText()).replace(/\n+/g,' | ').match(/Betalingen[^]{0,300}/)?.[0]);
  await b.scherm("B-na-reload");
  await b.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
