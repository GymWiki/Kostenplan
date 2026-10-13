const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "perf-tester-1", gebruiker: "a1", viewport: "mobiel", pad: "/dashboard/leads", maxStappen: 150 });
  const p = s.page;
  await p.getByRole("button", { name: /^Nina Nieuw/ }).click();
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => [...document.querySelectorAll("button,[role=dialog] *")].filter(e=>e.tagName==="BUTTON"&&e.getBoundingClientRect().width>0).map(e=>(e.getAttribute("aria-label")||e.innerText).trim().slice(0,50)));
  console.log("DRAWER", JSON.stringify(r));
  console.log("dialog", await p.evaluate(()=>{const d=document.querySelector("[role=dialog]"); return d? d.getAttribute("aria-label")+" | "+d.className.slice(0,80):"none"}));
  await p.keyboard.press("Escape");
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message.slice(0,400)); process.exit(1); });
