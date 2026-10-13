const c = require("/home/user/Kostenplan/test-results/persona-particulier/common.js");
(async () => {
  const s = await c.open(); const p = s.page;
  await c.vul(s);
  await p.getByText("Jouw kostenraming", { exact: true }).first().scrollIntoViewIfNeeded();
  const pdfBtn = p.getByRole("button", { name: /Bewaar als PDF/ });
  console.log("PDF knoppen:", await pdfBtn.count());
  const popP = p.waitForEvent("popup", { timeout: 8000 }).catch(() => null);
  const dl = p.waitForEvent("download", { timeout: 8000 }).catch(() => null);
  await pdfBtn.first().click(); s.stap();
  const [pop, d] = [await popP, await dl];
  console.log("POPUP", pop ? pop.url() : "geen", "DOWNLOAD", d ? d.suggestedFilename() : "geen");
  await p.waitForTimeout(2000);
  console.log("SCHERM", await s.scherm("na-pdf-klik"), "URL", p.url());
  if (d) { const pad = "/home/user/Kostenplan/test-results/persona-particulier/" + d.suggestedFilename(); await d.saveAs(pad); console.log("OPGESLAGEN", pad); }
  if (pop) { await pop.waitForLoadState("load").catch(()=>{}); console.log("POPUP TEKST", (await pop.innerText("body").catch(()=>"?")).slice(0,600)); console.log("POPUP SCHERM", await pop.screenshot({path:"/home/user/Kostenplan/test-results/screens/persona-particulier/03-pdf-popup.png"}).then(()=> "ok").catch(e=>e.message)); }
  console.log("CONSOLE", s.consoleFouten, "NET", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
