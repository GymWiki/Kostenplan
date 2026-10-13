const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const seed = k.seed(); const a2 = seed.a2;
const DIR = "/home/user/Kostenplan/test-results/screens/document-checker-1/";
const bekijk = async (s, naam, pad) => {
  await s.goto(pad);
  await s.page.waitForTimeout(800);
  const txt = await s.page.evaluate(() => document.querySelector("main")?.innerText || document.body.innerText);
  await s.page.screenshot({ path: DIR + "ui-" + naam + ".png", fullPage: true });
  console.log(`### ${naam} ${pad} -> ${s.page.url()}\n` + txt.replace(/\n{2,}/g, "\n").slice(0, 2500));
};
(async () => {
  const s = await k.open({ agent: "document-checker-1", gebruiker: "a2", viewport: "desktop", pad: null, maxStappen: 150 });
  await bekijk(s, "factuur-betaald", `/dashboard/facturen/${a2.facturen.betaald}`);
  await bekijk(s, "factuur-concept", `/dashboard/facturen/${a2.facturen.concept}`);
  await bekijk(s, "factuur-creditnota", `/dashboard/facturen/${a2.facturen.creditnota}`);
  await bekijk(s, "ahmed-offerte", `/dashboard/leads/${a2.leads.akkoord}/offerte`);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
