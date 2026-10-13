const c = require("/home/user/Kostenplan/test-results/persona-particulier/common.js");
(async () => {
  const s = await c.open(); const p = s.page;
  await s.goto("/t/devries-a1/tuinaanleg-a1");
  await c.vul(s);
  await p.emulateMedia({ media: "print" });
  await p.waitForTimeout(500);
  await p.pdf({ path: "/home/user/Kostenplan/test-results/persona-particulier/bewaar-als-pdf-print.pdf", format: "A4", printBackground: true });
  const pn = await p.evaluate(() => document.body.innerText.slice(0, 200));
  console.log("PRINT TEKST START:", pn.replace(/\n/g, " | "));
  const zichtbaar = await p.evaluate(() => { const r = document.querySelector("#wg-adres"); return r ? getComputedStyle(r).display : "geen"; });
  console.log("WG-ADRES display in print:", zichtbaar);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
