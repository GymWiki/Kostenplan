const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const fs = require("fs");
(async () => {
  const dir = "/tmp/claude-0/-home-user-Kostenplan/01bd42ce-f1f2-516d-9a1c-de269bf67bee/scratchpad";
  const s = await k.open({ agent: "verifier-09", gebruiker: "a3", viewport: "desktop", pad: "/dashboard" });
  const p = s.page; await p.waitForTimeout(1000);
  await p.getByRole("button", { name: /Hoveniersbedrijf De Vries/ }).first().click().catch(async()=>{ await p.getByText("Hoveniersbedrijf De Vries").first().click(); });
  await p.waitForTimeout(500);
  console.log("MENU:", (await p.locator("[role=menu], [role=listbox], [role=dialog]").allInnerTexts()).join("||").replace(/\n+/g," | "));
  await p.getByText("Groenstijl Tuinen").first().click(); await p.waitForTimeout(2500);
  await s.goto("/dashboard/leads/cmv71bewm00dtu07dr520at5b/offerte?herinnering=1");
  await p.waitForTimeout(1200);
  console.log("OFFERTE:", (await p.innerText("body")).replace(/\n+/g," | ").slice(0,1800));
  await s.scherm("groen-offerte");
  const r = await p.request.get(k.BASE + "/api/offertes/cmv71bewo00duu07dyk0la88t/pdf?versie=1", { timeout: 90000 });
  console.log("PDF", r.status());
  fs.writeFileSync(dir + "/groen.pdf", await r.body());
  await s.sluit();
})();
