const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "perf-tester-1", gebruiker: "a1", viewport: "mobiel", pad: "/dashboard/leads", maxStappen: 150 });
  const info = async (label) => {
    const r = await s.page.evaluate(() => {
      const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const btns = [...document.querySelectorAll("button,a[href]")].filter(vis).map((e) => (e.getAttribute("aria-label") || e.innerText || "").trim().slice(0, 40)).filter(Boolean);
      const sw = [...document.querySelectorAll("[role=switch],input[type=checkbox]")].map((e) => e.getAttribute("aria-label")).slice(0, 10);
      return { btns: btns.slice(0, 70), sw, url: location.href };
    });
    console.log(label, JSON.stringify(r));
  };
  await info("LEADS");
  const sc = await s.page.evaluate(() => [...document.querySelectorAll("button,[role=button],li,article,div[role=row]")].filter(e=>e.innerText&&e.innerText.length<200).length);
  console.log("cands", sc);
  await s.goto("/dashboard/tools/cmv6yly170003tn7du5nfpi8d/calculator");
  await info("CALC");
  await s.goto("/dashboard/facturen");
  await info("FACT");
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
