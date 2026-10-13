const k = require("/home/user/Kostenplan/scripts/test/agent-lib.js");
const label = process.argv[2] || "huidig";
(async () => {
  const s = await k.open({ agent: "flow-tester-7", gebruiker: "a3", viewport: "mobiel", pad: "/dashboard/profiel/bedrijfsgegevens", maxStappen: 60 });
  const p = s.page;
  const velden = await p.evaluate(() => [...document.querySelectorAll("input, textarea, select")].map((el) => {
    const id = el.id || el.name; const lab = el.labels && el.labels[0] ? el.labels[0].innerText : (el.getAttribute("aria-label") || el.name);
    return `${lab.replace(/\s+/g, " ").slice(0, 50)} = ${el.type === "checkbox" ? el.checked : (el.value || "").slice(0, 60)}`;
  }));
  console.log(`== ${label} velden:\n` + velden.join("\n"));
  await s.scherm(`${label}-waarden`);
  console.log("consoleFouten", s.consoleFouten);
  await s.sluit();
})().catch((e) => { console.error("FOUT", e.message); process.exit(1); });
