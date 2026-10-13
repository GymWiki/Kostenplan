const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const URL = "/dashboard/facturen/cmv6xym7700740s7d8h2wzb3g";
(async () => {
  const s = await k.open({ agent: "edge-case-tester-2", gebruiker: "a2", viewport: "desktop", pad: URL, maxStappen: 60 });
  const p = s.page;
  s.stap(); await p.getByRole("button", { name: "Definitief maken" }).click(); await p.waitForTimeout(1500);
  const posts = []; p.on("request", r => { if (r.method() === "POST") posts.push(r.url().slice(0, 80)); });
  const knop = p.locator('[role=dialog],[role=alertdialog]').getByRole("button", { name: "Definitief maken" });
  s.stap(); await knop.dblclick({ delay: 20 }).catch(e=>console.log("dbl fout", e.message.slice(0,200)));
  await p.waitForTimeout(3500);
  const t = await p.locator("body").innerText();
  console.log("url:", p.url(), "| concept nog:", /nog geen nummer/.test(t), "| nummer:", t.match(/F2026-\d{4}/g)?.slice(0,3));
  console.log("POSTs:", posts.length);
  await s.scherm("definitief-dialog-dbl");
  console.log("console:", s.consoleFouten.slice(-3), "net:", s.netwerkFouten.slice(-3));
  await s.sluit();
})().catch(e => { console.error("FOUT", e.message); process.exit(1); });
