const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const seed = require("/home/user/Kostenplan/test-results/seed.json").a1;
const btns = (p) => p.evaluate(() => [...document.querySelectorAll("button,a[href]")].filter(e=>e.getBoundingClientRect().width>0).map(e=>(e.getAttribute("aria-label")||e.innerText).trim().slice(0,40)).filter(Boolean));
(async () => {
  const s = await k.open({ agent: "perf-tester-1", gebruiker: "a1", viewport: "mobiel", pad: `/dashboard/leads/${seed.leads["offerte-concept"]}/offerte`, maxStappen: 150 });
  console.log("OFFERTE", JSON.stringify(await btns(s.page)));
  await s.goto(`/dashboard/facturen/${seed.facturen.verstuurd}`);
  console.log("FACTUUR", JSON.stringify(await btns(s.page)), s.page.url());
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.slice(0,400)); process.exit(1); });
