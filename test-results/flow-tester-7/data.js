const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const label = process.argv[2] || "huidig";
(async () => {
  const s = await k.open({ agent: "flow-tester-7", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/profiel/bedrijfsgegevens", maxStappen: 60 });
  const p = s.page;
  const tekst = async (pad, n = 900) => { s.stap(); await p.goto(k.BASE + pad, { waitUntil: "networkidle" }); const t = await p.locator("body").innerText(); return t.replace(/\n+/g, " | ").slice(0, n); };
  console.log(`== ${label} bedrijfsgegevens:\n`, await tekst("/dashboard/profiel/bedrijfsgegevens", 1400));
  await s.scherm(`${label}-bedrijfsgegevens`);
  console.log(`== ${label} leads:\n`, await tekst("/dashboard/leads", 700));
  console.log(`== ${label} rekentools:\n`, await tekst("/dashboard/tools", 600));
  console.log(`== ${label} abonnement:\n`, await tekst("/dashboard/profiel/abonnement", 700));
  console.log("consoleFouten", s.consoleFouten, "netwerk", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
