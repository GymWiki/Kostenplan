const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
(async () => {
  const s = await k.open({ agent: "flow-tester-7", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/profiel", maxStappen: 120 });
  const p = s.page;
  const txt = async (pad, n = 500) => { s.stap(); await p.goto(k.BASE + pad, { waitUntil: "networkidle" }); return (await p.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, n); };
  const velden = async (pad) => { s.stap(); await p.goto(k.BASE + pad, { waitUntil: "networkidle" }); return p.evaluate(() => [...document.querySelectorAll("input, textarea, select")].map((el) => { const lab = el.labels && el.labels[0] ? el.labels[0].innerText : (el.getAttribute("aria-label") || el.name); return `${lab.replace(/\s+/g, " ").slice(0, 40)} = ${el.type === "checkbox" ? el.checked : (el.value || "").slice(0, 50)}`; }).filter((x)=>!x.startsWith("$")).join("\n")); };
  const kop = async () => (await p.locator("body").innerText()).split("\n").slice(0, 8).join(" | ");
  const wissel = async (naam) => {
    await p.goto(k.BASE + "/dashboard/profiel", { waitUntil: "networkidle" });
    s.stap(); await p.getByRole("button", { name: /Hoveniersbedrijf De Vries|Groenstijl Tuinen/ }).first().click();
    await p.waitForTimeout(400); s.stap();
    await p.getByRole("button", { name: new RegExp(naam) }).last().click();
    await p.waitForLoadState("networkidle"); await p.waitForTimeout(700);
  };
  for (const naam of ["Groenstijl Tuinen", "Hoveniersbedrijf De Vries"]) {
    await wissel(naam);
    console.log(`\n######## ${naam}\nkop: ${await kop()}`);
    console.log("-- velden bedrijfsgegevens:\n" + await velden("/dashboard/profiel/bedrijfsgegevens"));
    console.log("-- leads:", await txt("/dashboard/leads", 260));
    console.log("-- tools:", await txt("/dashboard/tools", 200));
    console.log("-- abonnement:", (await txt("/dashboard/profiel/abonnement", 300)));
    console.log("-- werkgebied:", await txt("/dashboard/profiel/werkgebied", 350));
    console.log("-- tarieven:", await txt("/dashboard/profiel/tarieven", 300));
  }
  console.log("consoleFouten", s.consoleFouten, "netwerk", s.netwerkFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
